import type { MapType, Settings, Extent, ProgressData } from '~/types/types'
import { useFetchTerrainTiles, useFetchOceanTiles, limitedParallelFetch } from '~/composables/useFetchTiles'
import { mapSpec, cubicFamily, PIXELS_PER_TILE } from '~/utils/const'
import { TileDecoder } from '~/utils/tileDecoder'
import { lanczos } from './interpolation/lanczos'
import { bicubic } from './interpolation/bicubic'
import { bilinear } from './interpolation/bilinear'

const addPadding = (
  grid: (Float32Array | null)[][],
  centerY: number,
  centerX: number,
  padding: number,
) => {
  const paddedSize = PIXELS_PER_TILE + padding * 2
  const output = new Float32Array(paddedSize * paddedSize)

  const getTile = (y: number, x: number): Float32Array => {
    if (grid[y][x]) {
      return grid[y][x]
    } else {
      throw new Error(`Tile not found at (${y}, ${x})`)
    }
  }

  const a = getTile(centerY - 1, centerX - 1)
  const b = getTile(centerY - 1, centerX)
  const c = getTile(centerY - 1, centerX + 1)
  const d = getTile(centerY, centerX - 1)
  const e = getTile(centerY, centerX)
  const f = getTile(centerY, centerX + 1)
  const g = getTile(centerY + 1, centerX - 1)
  const h = getTile(centerY + 1, centerX)
  const i = getTile(centerY + 1, centerX + 1)

  const copyRegion = (
    dstX: number,
    dstY: number,
    src: Float32Array,
    srcX: number,
    srcY: number,
    width: number,
    height: number,
  ) => {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIndex = (srcY + y) * PIXELS_PER_TILE + (srcX + x)
        const dstIndex = (dstY + y) * paddedSize + (dstX + x)
        output[dstIndex] = src[srcIndex]
      }
    }
  }

  copyRegion(padding, padding, e, 0, 0, PIXELS_PER_TILE, PIXELS_PER_TILE)

  copyRegion(padding, 0, b, 0, PIXELS_PER_TILE - padding, PIXELS_PER_TILE, padding)
  copyRegion(padding, paddedSize - padding, h, 0, 0, PIXELS_PER_TILE, padding)
  copyRegion(0, padding, d, PIXELS_PER_TILE - padding, 0, padding, PIXELS_PER_TILE)
  copyRegion(paddedSize - padding, padding, f, 0, 0, padding, PIXELS_PER_TILE)

  copyRegion(0, 0, a, PIXELS_PER_TILE - padding, PIXELS_PER_TILE - padding, padding, padding)
  copyRegion(paddedSize - padding, 0, c, 0, PIXELS_PER_TILE - padding, padding, padding)
  copyRegion(0, paddedSize - padding, g, PIXELS_PER_TILE - padding, 0, padding, padding)
  copyRegion(paddedSize - padding, paddedSize - padding, i, 0, 0, padding, padding)

  return output
}

const subdivide = async (
  mapType: MapType,
  decoder: TileDecoder,
  elevations: (Float32Array | null)[][],
  subdividedElevations: (Float32Array | null)[][],
  x: number,
  y: number,
  padding: number,
  count: number,
  margin: number,
  enhance: number,
  damping: number,
) => {
  const inputData = addPadding(elevations, y + 1, x + 1, padding)
  const subdividedTile = await decoder.subdivideTile(inputData, count, margin, enhance, damping)

  if (mapType === 'ocean') {
    for (let i = 0; i < subdividedTile.length; i++) {
      subdividedTile[i] = Math.min(subdividedTile[i], 0)
    }
  }

  subdividedElevations[y][x] = subdividedTile
}

/**
 * Get heightmap in Float32Array.\
 * The returned image size is increased by 200px to account for edge processing.
 * @param mapType
 * @param settings
 * @param extent rotated extent
 * @param mapPixels the number of pixels corresponding to extent, excluding the correction part and including padding
 * @param pixelsPerTile
 * @return Promise\<Float32Array, ImageBitmap\>
 */
export const getHeightmap = async (
  mapType: MapType,
  settings: Settings,
  extent: Extent,
  mapPixels: number,
  pixelsPerTile: number,
  progressCallback: (data: ProgressData) => void,
) => {
  const decoder = new TileDecoder()
  try {
    const side = Math.sqrt((extent.topright.x - extent.bottomleft.x) ** 2 + (extent.topright.y - extent.bottomleft.y) ** 2) / Math.SQRT2
    const _correction = mapSpec[settings.gridInfo].correction
    const maxZoom = mapType === 'ocean' ? 7 : 14
    const zoom = Math.min(Math.ceil(Math.log2(mapPixels / side)) + Math.log2(settings.oversampling), maxZoom)
    const scale = (side * (2 ** zoom)) / mapPixels
    const maxTileX = 2 ** zoom - 1
    const ppt = Math.max(pixelsPerTile, PIXELS_PER_TILE)
    const subdivisionCount = Math.log2(ppt / PIXELS_PER_TILE)

    const minX = Math.min(extent.topleft.x, extent.topright.x, extent.bottomleft.x, extent.bottomright.x)
    const maxX = Math.max(extent.topleft.x, extent.topright.x, extent.bottomleft.x, extent.bottomright.x)

    const minY = Math.min(extent.topleft.y, extent.topright.y, extent.bottomleft.y, extent.bottomright.y)
    const maxY = Math.max(extent.topleft.y, extent.topright.y, extent.bottomleft.y, extent.bottomright.y)

    const tileX0 = Math.floor(minX * (2 ** zoom) / ppt)
    const tileY0 = Math.floor(minY * (2 ** zoom) / ppt)
    const tileX1 = Math.floor(maxX * (2 ** zoom) / ppt)
    const tileY1 = Math.floor(maxY * (2 ** zoom) / ppt)

    const paddingTileCount = subdivisionCount > 0 ? 1 : 0
    const dlTileX0 = tileX0 - paddingTileCount
    const dlTileY0 = tileY0 - paddingTileCount
    const dlTileX1 = tileX1 + paddingTileCount
    const dlTileY1 = tileY1 + paddingTileCount

    const resultCenterX = extent.centerX * (2 ** zoom)
    const resultCenterY = extent.centerY * (2 ** zoom)

    const offsetX = resultCenterX - tileX0 * ppt - 0.5
    const offsetY = resultCenterY - tileY0 * ppt - 0.5

    const tileCountX = dlTileX1 - dlTileX0 + 1
    const tileCountY = dlTileY1 - dlTileY0 + 1
    const totalTiles = tileCountX * tileCountY

    console.log('mapType:', mapType, 'zoom:', zoom, 'scale:', scale, `(${(1 / scale * 100).toFixed(2)}%)`, 'subdivisionCount:', subdivisionCount, 'totalTiles:', totalTiles)

    progressCallback({ type: 'total', data: totalTiles })

    // input padding is 220 but output padding is 200
    // for FFT processing, the output size must be an even number
    const px = mapPixels + _correction - 20
    const resultPixels = px % 2 === 0 ? px : px + 1

    const decodeTasks: (() => Promise<void>)[] = []

    const elevations: (Float32Array | null)[][] = Array.from({ length: tileCountY }, () => Array(tileCountX).fill(null))
    const subdividedElevations: (Float32Array | null)[][] | undefined = subdivisionCount > 0
      ? Array.from({ length: tileCountY - 2 }, () => Array(tileCountX - 2).fill(null))
      : undefined

    const token = settings.useMapbox ? settings.accessToken! : settings.accessTokenMT!

    // fetching and decoding tiles
    for (let y = 0; y < tileCountY; y++) {
      const tileY = dlTileY0 + y
      for (let x = 0; x < tileCountX; x++) {
        const tileX = (dlTileX0 + x + maxTileX + 1) & maxTileX

        decodeTasks.push(async () => {
          try {
            const tileRes = mapType === 'ocean'
              ? await useFetchOceanTiles(zoom, tileX, tileY, settings.accessTokenMT!)
              : await useFetchTerrainTiles(zoom, tileX, tileY, token, settings.useMapbox)

            if (tileRes.status === 'error') {
              throw new Error(`Fetch error: ${tileRes.error.message}`)
            }

            const arrBuffer = await tileRes.data.arrayBuffer()
            elevations[y][x] = await decoder.decodeTile(arrBuffer, settings.useMapbox, mapType)

            progressCallback({ type: 'progress' })
          } catch (error) {
            if (error instanceof Error) {
              console.error('Error fetching or decoding tile:', error.message)
            } else {
              console.error('Unknown error:', error)
            }
          }
        })
      }
    }
    await limitedParallelFetch(decodeTasks)

    if (subdivisionCount > 0) {
      progressCallback({ type: 'subdividingTotal', data: (tileCountY - 2) * (tileCountX - 2) })

      const subdividePromise: Promise<void>[] = []
      const padding = 4

      for (let y = 0; y < tileCountY - 2; y++) {
        for (let x = 0; x < tileCountX - 2; x++) {
          subdividePromise.push((async () => {
            try {
              progressCallback({ type: 'subdividingProgress' })
              await subdivide(
                mapType,
                decoder,
                elevations,
                subdividedElevations!,
                x,
                y,
                padding,
                subdivisionCount,
                settings.subdivisionMargin / 100,
                settings.subdivisionEnhance / 100,
                settings.subdivisionDamping / 100,
              )
            } catch (error) {
              if (error instanceof Error) {
                console.error('Error subdividing tile:', error.message)
              } else {
                console.error('Unknown error:', error)
              }
            }
          })())
        }
      }
      await Promise.all(subdividePromise)
    }

    const source = subdivisionCount > 0 ? subdividedElevations : elevations

    if (settings.interpolation === 'lanczos') {
      return lanczos(source!, resultPixels, settings.angle, scale, offsetX, offsetY, _correction, ppt,
        settings.lanczosWindowSize)
    } else if (settings.interpolation === 'bicubic') {
      return bicubic(source!, resultPixels, settings.angle, scale, offsetX, offsetY, _correction, ppt,
        cubicFamily[settings.cubicFamily].b, cubicFamily[settings.cubicFamily].c)
    } else {
      return bilinear(source!, resultPixels, settings.angle, scale, offsetX, offsetY, _correction, ppt)
    }
  } catch (error) {
    console.error('An error occurred in getHeightMap:', error)
    throw error
  } finally {
    await decoder?.terminate()
  }
}
