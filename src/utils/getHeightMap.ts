import type { MapType, Settings, Extent } from '~/types/types'
import { decode as decode_webp } from '@jsquash/webp'
import initPng, { decode_png } from '~~/png_lib/pkg'
import { decodeElevation } from '~/utils/elevation'
import { useFetchTerrainTiles } from '~/composables/useFetchTiles'
import { mapSpec } from '~/utils/const'
import type { FetchError } from 'ofetch'
import { TileDecoder } from '~/utils/tileDecoder'

type T = {
  data: Blob | undefined
  error: FetchError<any> | undefined
}

const getHeightMapBilinear = (
  elevations: Float32Array,
  resultPixels: number,
  tilePixels: number,
  angle: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  correction: number,
) => {
  const heightMap = new Float32Array(resultPixels * resultPixels)
  const cosTheta = Math.cos(-angle * Math.PI / 180)
  const sinTheta = Math.sin(-angle * Math.PI / 180)
  const halfSize = (resultPixels - correction) / 2

  // affine transformation & bilinear interpolation
  for (let y = 0; y < resultPixels; y++) {
    for (let x = 0; x < resultPixels; x++) {
      const posX = offsetX + scale * (cosTheta * (x - halfSize) + sinTheta * (y - halfSize))
      const posY = offsetY + scale * (cosTheta * (y - halfSize) - sinTheta * (x - halfSize))

      const x0 = Math.floor(posX)
      const y0 = Math.floor(posY)
      const x1 = x0 + 1
      const y1 = y0 + 1

      const eX = x1 - posX
      const eY = y1 - posY
      const dX = posX - x0
      const dY = posY - y0

      const val
        = eX * eY * elevations[y0 * tilePixels + x0]
        + dX * eY * elevations[y0 * tilePixels + x1]
        + eX * dY * elevations[y1 * tilePixels + x0]
        + dX * dY * elevations[y1 * tilePixels + x1]

      heightMap[y * resultPixels + x] = val
    }
  }

  /**
   * affine transformation
   *
   * a, b: offset x, y
   * m: mapsize / 2
   * θ = -angle * π / 180
   * x = a - m * s * cos(θ) + s * x * cos(θ) - m * s * sin(θ) + s * y * sin(θ)
   * y = b - m * s * cos(θ) + s * y * cos(θ) + m * s * sin(θ) - s * x * sin(θ)
   *
   *
   * bilinear interpolation
   *
   * x = dX, y = dY
   *
   *      eX   dX
   *    0--------
   * eY |        |
   *    |   x,y__|
   * dY |     |  |
   *     --------1
   */

  return heightMap
}

// bicubic interpolation -----------------------------------------------------------------------------

const getHeightMapBicubic = (
  elevations: Float32Array,
  resultPixels: number,
  tilePixels: number,
  angle: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  correction: number,
) => {
  const heightMap = new Float32Array(resultPixels * resultPixels)
  const cosTheta = Math.cos(-angle * Math.PI / 180)
  const sinTheta = Math.sin(-angle * Math.PI / 180)
  const halfSize = (resultPixels - correction) / 2

  // affine transformation & bicubic interpolation
  // Mitchell
  const b = 1 / 3
  const c = 1 / 3
  const coeff = cubicBCcoefficient(b, c)

  for (let y = 0; y < resultPixels; y++) {
    for (let x = 0; x < resultPixels; x++) {
      const posX = offsetX + scale * (cosTheta * (x - halfSize) + sinTheta * (y - halfSize))
      const posY = offsetY + scale * (cosTheta * (y - halfSize) - sinTheta * (x - halfSize))

      const x0 = Math.floor(posX)
      const y0 = Math.floor(posY)
      const tx = posX - x0
      const ty = posY - y0

      const fx = [
        cubicFunc(1 + tx, coeff),
        cubicFunc(tx, coeff),
        cubicFunc(1 - tx, coeff),
        cubicFunc(2 - tx, coeff),
      ]
      const fy = [
        cubicFunc(1 + ty, coeff),
        cubicFunc(ty, coeff),
        cubicFunc(1 - ty, coeff),
        cubicFunc(2 - ty, coeff),
      ]

      const tmpVals = [
        fy[0] * elevations[(y0 - 1) * tilePixels + x0 - 1] + fy[1] * elevations[y0 * tilePixels + x0 - 1] + fy[2] * elevations[(y0 + 1) * tilePixels + x0 - 1] + fy[3] * elevations[(y0 + 2) * tilePixels + x0 - 1],
        fy[0] * elevations[(y0 - 1) * tilePixels + x0] + fy[1] * elevations[y0 * tilePixels + x0] + fy[2] * elevations[(y0 + 1) * tilePixels + x0] + fy[3] * elevations[(y0 + 2) * tilePixels + x0],
        fy[0] * elevations[(y0 - 1) * tilePixels + x0 + 1] + fy[1] * elevations[y0 * tilePixels + x0 + 1] + fy[2] * elevations[(y0 + 1) * tilePixels + x0 + 1] + fy[3] * elevations[(y0 + 2) * tilePixels + x0 + 1],
        fy[0] * elevations[(y0 - 1) * tilePixels + x0 + 2] + fy[1] * elevations[y0 * tilePixels + x0 + 2] + fy[2] * elevations[(y0 + 1) * tilePixels + x0 + 2] + fy[3] * elevations[(y0 + 2) * tilePixels + x0 + 2],
      ]

      heightMap[y * resultPixels + x] = fx[0] * tmpVals[0] + fx[1] * tmpVals[1] + fx[2] * tmpVals[2] + fx[3] * tmpVals[3]
    }
  }

  function cubicBCcoefficient(b: number, c: number) {
    const p = 2 - 1.5 * b - c
    const q = -3 + 2 * b + c
    const r = 0
    const s = 1 - (1 / 3) * b
    const t = -(1 / 6) * b - c
    const u = b + 5 * c
    const v = -2 * b - 8 * c
    const w = (4 / 3) * b + 4 * c
    return [p, q, r, s, t, u, v, w]
  }

  function cubicFunc(x: number, coeff: number[]) {
    const [p, q, r, s, t, u, v, w] = coeff
    let y = 0
    const ax = Math.abs(x)
    if (ax < 1) {
      y = ((p * ax + q) * ax + r) * ax + s
    } else if (ax < 2) {
      y = ((t * ax + u) * ax + v) * ax + w
    }
    return y
  }

  return heightMap
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
  onTotal: (total: number) => void,
  onProgress: () => void,
) => {
  const decoder = new TileDecoder()
  try {
    const side = Math.sqrt((extent.topright.x - extent.bottomleft.x) ** 2 + (extent.topright.y - extent.bottomleft.y) ** 2) / Math.SQRT2
    const _correction = mapSpec[settings.gridInfo].correction
    const maxZoom = mapType === 'ocean' ? 7 : 14
    const zoom = Math.min(Math.ceil(Math.log2(mapPixels / side)), maxZoom)
    const scale = (side * (2 ** zoom)) / mapPixels


    const minX = Math.min(extent.topleft.x, extent.topright.x, extent.bottomleft.x, extent.bottomright.x)
    const maxX = Math.max(extent.topleft.x, extent.topright.x, extent.bottomleft.x, extent.bottomright.x)

    const minY = Math.min(extent.topleft.y, extent.topright.y, extent.bottomleft.y, extent.bottomright.y)
    const maxY = Math.max(extent.topleft.y, extent.topright.y, extent.bottomleft.y, extent.bottomright.y)

    const tileX0 = Math.floor(minX * (2 ** zoom) / pixelsPerTile)
    const tileY0 = Math.floor(minY * (2 ** zoom) / pixelsPerTile)
    const tileX1 = Math.floor(maxX * (2 ** zoom) / pixelsPerTile)
    const tileY1 = Math.floor(maxY * (2 ** zoom) / pixelsPerTile)

    const resultCenterX = extent.centerX * (2 ** zoom)
    const resultCenterY = extent.centerY * (2 ** zoom)

    const offsetX = resultCenterX - tileX0 * pixelsPerTile - _correction / 2
    const offsetY = resultCenterY - tileY0 * pixelsPerTile - _correction / 2

    const tileCount = Math.max(tileX1 - tileX0 + 1, tileY1 - tileY0 + 1)
    const tilePixels = tileCount * pixelsPerTile
    const maxTileX = 2 ** zoom - 1

    // input padding is 220 but output padding is 200
    const resultPixels = mapPixels + _correction - 20
    const totalTiles = tileCount * tileCount
    onTotal(totalTiles)

    const tiles = new Array<Promise<T>>(totalTiles)
    const elevations = new Float32Array(tilePixels * tilePixels)
    const token = settings.useMapbox ? settings.accessToken! : settings.accessTokenMT!

    // fetch tiles
    for (let y = 0; y < tileCount; y++) {
      for (let x = 0; x < tileCount; x++) {
        const tileX = (tileX0 + x + maxTileX + 1) & maxTileX
        const tileY = tileY0 + y

        if (mapType === 'ocean') {
          tiles[y * tileCount + x] = useFetchOceanTiles(zoom, tileX, tileY, settings.accessTokenMT!)
        } else {
          tiles[y * tileCount + x] = useFetchTerrainTiles(zoom, tileX, tileY, token, settings.useMapbox)
        }
      }
    }
    const tileList = await Promise.allSettled(tiles)

    if (totalTiles > 30) {
      await decoder.processTiles(
        tileList,
        settings,
        mapType,
        pixelsPerTile,
        tileCount,
        elevations,
        onProgress,
      )
    } else {
      if (mapType !== 'ocean' || settings.useMapbox) {
        await initPng()
      }

      const processTiles = async (list: PromiseSettledResult<T>[]) => {
        const tilePromises = list.map(async (tile, index) => {
          if (tile.status === 'fulfilled') {
            const blob = tile.value.data
            if (blob) {
              const arrBuffer = await blob.arrayBuffer()
              let byteArray: Uint8ClampedArray
              if (mapType === 'ocean' || !settings.useMapbox) {
                const imgData = await decode_webp(arrBuffer)
                byteArray = new Uint8ClampedArray(imgData.data)
              } else {
                const arr = new Uint8Array(arrBuffer)
                const byte = await decode_png({ data: arr })
                byteArray = new Uint8ClampedArray(byte.data)
              }
              const elevs = decodeElevation(byteArray)
              const dy = Math.floor(index / tileCount) * pixelsPerTile
              const dx = (index % tileCount) * pixelsPerTile

              for (let y = 0; y < pixelsPerTile; y++) {
                for (let x = 0; x < pixelsPerTile; x++) {
                  elevations[(dy + y) * tilePixels + (dx + x)] = elevs[y * pixelsPerTile + x]
                }
              }
              onProgress()
            }
          }
        })
        await Promise.all(tilePromises)
      }
      await processTiles(tileList)
    }

    const result = settings.interpolation === 'bicubic'
      ? getHeightMapBicubic(elevations, resultPixels, tilePixels, settings.angle, scale, offsetX, offsetY, _correction)
      : getHeightMapBilinear(elevations, resultPixels, tilePixels, settings.angle, scale, offsetX, offsetY, _correction)

    return result
  } catch (error) {
    console.error('An error occurred in getHeightMap:', error)
    throw error
  } finally {
    await decoder.terminate()
  }
}
