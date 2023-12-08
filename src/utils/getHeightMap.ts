import { FetchError } from 'ofetch'
import * as turf from '@turf/turf'
import type { Mapbox } from '~/types/types'

type T = {
  data: globalThis.Ref<Blob | null>;
  error: globalThis.Ref<FetchError<any> | null>;
}


const getInitParameter = (mapbox: Ref<Mapbox>) => {
  const resultPixels = mapSpec[mapbox.value.settings.gridInfo].mapPixels + 4          // cs1: 1085px  cs2: 4100px
  const calcPixels = resultPixels + 5                                                 // cs1: 1090px  cs2: 4105px
  const fasesOffset = mapbox.value.settings.gridInfo === 'cs2' ? 0 : 1
  const mapFases = mapSpec[mapbox.value.settings.gridInfo].mapPixels - fasesOffset    // cs1: 1080px  cs2: 4096px
  const tmpAreaSize = mapbox.value.settings.size / mapFases * calcPixels
  const pixelsPerTile = 512                                                           // number of pixels in terrain-tiles
  return { resultPixels, calcPixels, tmpAreaSize, pixelsPerTile }
}


const getExtentData = (mapbox: Ref<Mapbox>, areaSize: number) => {
  const { topleft, bottomright } = getExtent(
    mapbox.value.settings.lng,
    mapbox.value.settings.lat,
    areaSize * Math.SQRT2 / 2,
    areaSize * Math.SQRT2 / 2,
  )

  let referenceLat: number

  if (Math.abs(topleft[1]) >= Math.abs(bottomright[1])) {
    referenceLat = topleft[1]
  } else {
    referenceLat = bottomright[1]
  }

  return { topleft, bottomright, referenceLat }
}


const getTileInfo = (mapbox: Ref<Mapbox>, topleft: turf.Position, bottomright: turf.Position, zoom: number, pixelsPerTile: number, calcPixels: number) => {
  const tileX = lng2tile(topleft[0], zoom)
  const tileY = lat2tile(topleft[1], zoom)
  const x2 = lng2tile(bottomright[0], zoom)
  const y2 = lat2tile(bottomright[1], zoom)
  const tileCount = Math.max(x2 - tileX + 1, y2 - tileY + 1)

  const posX0 = lng2pixel(topleft[0], zoom, pixelsPerTile)
  const posY0 = lat2pixel(topleft[1], zoom, pixelsPerTile)
  const posX1 = lng2pixel(bottomright[0], zoom, pixelsPerTile)
  const posY1 = lat2pixel(bottomright[1], zoom, pixelsPerTile)
  const centerX = lng2pixel(mapbox.value.settings.lng, zoom, pixelsPerTile)
  const centerY = lat2pixel(mapbox.value.settings.lat, zoom, pixelsPerTile)

  const mapWidth = posX1 - posX0
  const mapHeight = posY1 - posY0

  const tilePosX = tileX * pixelsPerTile
  const tilePosY = tileY * pixelsPerTile

  const tilePixels = tileCount * pixelsPerTile
  const mapPixelsOnTile = Math.sqrt(mapWidth * mapWidth + mapHeight * mapHeight) / Math.SQRT2
  const scale = mapPixelsOnTile / (calcPixels * Math.SQRT2)

  const offsetX = centerX - tilePosX
  const offsetY = centerY - tilePosY

  return { tileX, tileY, tileCount, tilePixels, scale, offsetX, offsetY }
}


// bilinear interpolation ----------------------------------------------------------------------------

const getHeightMapBilinear = async () => {
  const mapbox = useMapbox()
  const { resultPixels, calcPixels, tmpAreaSize, pixelsPerTile } = getInitParameter(mapbox)
  const { topleft, bottomright, referenceLat } = getExtentData(mapbox, tmpAreaSize)
  const zoom = Math.min(Math.ceil(calculateZoomLevel(referenceLat, tmpAreaSize, calcPixels, pixelsPerTile)), 14)
  const { tileX, tileY, tileCount, tilePixels, scale, offsetX, offsetY } = getTileInfo(mapbox, topleft, bottomright, zoom, pixelsPerTile, calcPixels)

  const tiles = new Array<Promise<T>>(Math.pow(tileCount, 2))

  const tileCanvas = ref<HTMLCanvasElement>()
  tileCanvas.value = document.getElementById('tile-canvas') as HTMLCanvasElement
  tileCanvas.value.width = tilePixels
  tileCanvas.value.height = tilePixels

  const tileCtx = tileCanvas.value.getContext('2d', { storage: 'discardable', willReadFrequently: true }) as CanvasRenderingContext2D
  tileCtx.fillStyle = 'rgb(1, 134, 160)'    // = 0m
  tileCtx.fillRect(0, 0, tileCanvas.value.width, tileCanvas.value!.height)

  for (let i = 0; i < tileCount; i++) {
    for (let j = 0; j < tileCount; j++) {
      tiles[j + i * tileCount] = useFetchTerrainTiles(zoom, tileX + j, tileY + i)
    }
  }

  const tileList = await Promise.allSettled(tiles)
  const pixelData = (await processTiles(tileList)).data

  const elevations = decodeElevation(pixelData)

  const heightMap = new Float32Array(resultPixels * resultPixels)

  const cosTheta = Math.cos(-mapbox.value.settings.angle * Math.PI / 180)
  const sinTheta = Math.sin(-mapbox.value.settings.angle * Math.PI / 180)

  const fasesOffset = mapbox.value.settings.gridInfo === 'cs2' ? 0 : 1
  const halfSize = (resultPixels - fasesOffset) / 2                         // cs1: 542px  cs2: 2050px

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

      const val =
        eX * eY * elevations[y0 * tilePixels + x0] +
        dX * eY * elevations[y0 * tilePixels + x1] +
        eX * dY * elevations[y1 * tilePixels + x0] +
        dX * dY * elevations[y1 * tilePixels + x1]

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

  async function processTiles(list: PromiseSettledResult<T>[]) {
    const tilePromises = list.map(async (tile, index) => {
      if (tile.status === 'fulfilled') {
        const blob = tile.value.data.value
        if (blob) {
          const png = await createImageBitmap(blob)
          const dx = Math.floor(index % tileCount) * pixelsPerTile
          const dy = Math.floor(index / tileCount) * pixelsPerTile
          tileCtx.drawImage(png, dx, dy)
        }
      }
    })
    await Promise.all(tilePromises)
    return tileCtx.getImageData(0, 0, tileCanvas.value!.width, tileCanvas.value!.height)
  }

  return heightMap
}


// bicubic interpolation -----------------------------------------------------------------------------

const getHeightMapBicubic = async () => {
  const mapbox = useMapbox()
  const { resultPixels, calcPixels, tmpAreaSize, pixelsPerTile } = getInitParameter(mapbox)
  const { topleft, bottomright, referenceLat } = getExtentData(mapbox, tmpAreaSize)
  const zoom = Math.min(Math.ceil(calculateZoomLevel(referenceLat, tmpAreaSize, calcPixels, pixelsPerTile)), 14)
  const { tileX, tileY, tileCount, tilePixels, scale, offsetX, offsetY } = getTileInfo(mapbox, topleft, bottomright, zoom, pixelsPerTile, calcPixels)

  const tiles = new Array<Promise<T>>(Math.pow(tileCount, 2))

  const tileCanvas = ref<HTMLCanvasElement>()
  tileCanvas.value = document.getElementById('tile-canvas') as HTMLCanvasElement
  tileCanvas.value.width = tilePixels
  tileCanvas.value.height = tilePixels

  const tileCtx = tileCanvas.value.getContext('2d', { storage: 'discardable', willReadFrequently: true }) as CanvasRenderingContext2D
  tileCtx.fillStyle = 'rgb(1, 134, 160)'    // = 0m
  tileCtx.fillRect(0, 0, tileCanvas.value.width, tileCanvas.value!.height)

  for (let i = 0; i < tileCount; i++) {
    for (let j = 0; j < tileCount; j++) {
      tiles[j + i * tileCount] = useFetchTerrainTiles(zoom, tileX + j, tileY + i)
    }
  }

  const tileList = await Promise.allSettled(tiles)
  const pixelData = (await processTiles(tileList)).data

  const elevations = decodeElevation(pixelData)

  const heightMap = new Float32Array(resultPixels * resultPixels)

  const cosTheta = Math.cos(-mapbox.value.settings.angle * Math.PI / 180)
  const sinTheta = Math.sin(-mapbox.value.settings.angle * Math.PI / 180)

  const fasesOffset = mapbox.value.settings.gridInfo === 'cs2' ? 0 : 1
  const halfSize = (resultPixels - fasesOffset) / 2                         // cs1: 542px  cs2: 2050px

  // affine transformation & bicubic interpolation

  const a = mapbox.value.settings.gridInfo === 'cs2' ? -0.5 : -1

  for (let y = 0; y < resultPixels; y++) {
    for (let x = 0; x < resultPixels; x++) {
      const posX = offsetX + scale * (cosTheta * (x - halfSize) + sinTheta * (y - halfSize))
      const posY = offsetY + scale * (cosTheta * (y - halfSize) - sinTheta * (x - halfSize))

      const x0 = Math.floor(posX)
      const y0 = Math.floor(posY)
      const tx = posX - x0
      const ty = posY - y0

      const fx = [
        cubicFunc(1 + tx),
        cubicFunc(tx),
        cubicFunc(1 - tx),
        cubicFunc(2 - tx),
      ]

      const fy = [
        cubicFunc(1 + ty),
        cubicFunc(ty),
        cubicFunc(1 - ty),
        cubicFunc(2 - ty),
      ]

      const tmpVals = [
        fy[0] * elevations[(y0 - 1) * tilePixels + x0 - 1] + fy[1] * elevations[y0 * tilePixels + x0 - 1] + fy[2] * elevations[(y0 + 1) * tilePixels + x0 - 1] + fy[3] * elevations[(y0 + 2) * tilePixels + x0 - 1],
        fy[0] * elevations[(y0 - 1) * tilePixels + x0]     + fy[1] * elevations[y0 * tilePixels + x0]     + fy[2] * elevations[(y0 + 1) * tilePixels + x0]     + fy[3] * elevations[(y0 + 2) * tilePixels + x0],
        fy[0] * elevations[(y0 - 1) * tilePixels + x0 + 1] + fy[1] * elevations[y0 * tilePixels + x0 + 1] + fy[2] * elevations[(y0 + 1) * tilePixels + x0 + 1] + fy[3] * elevations[(y0 + 2) * tilePixels + x0 + 1],
        fy[0] * elevations[(y0 - 1) * tilePixels + x0 + 2] + fy[1] * elevations[y0 * tilePixels + x0 + 2] + fy[2] * elevations[(y0 + 1) * tilePixels + x0 + 2] + fy[3] * elevations[(y0 + 2) * tilePixels + x0 + 2],
      ]

      heightMap[y * resultPixels + x] = fx[0] * tmpVals[0] + fx[1] * tmpVals[1] + fx[2] * tmpVals[2] + fx[3] * tmpVals[3]
    }
  }

  async function processTiles(list: PromiseSettledResult<T>[]) {
    const tilePromises = list.map(async (tile, index) => {
      if (tile.status === 'fulfilled') {
        const blob = tile.value.data.value
        if (blob) {
          const png = await createImageBitmap(blob)
          const dx = Math.floor(index % tileCount) * pixelsPerTile
          const dy = Math.floor(index / tileCount) * pixelsPerTile
          tileCtx.drawImage(png, dx, dy)
        }
      }
    })
    await Promise.all(tilePromises)
    return tileCtx.getImageData(0, 0, tileCanvas.value!.width, tileCanvas.value!.height)
  }

  function cubicFunc(t: number) {
    let res: number
    if (t <= 1) {
      res = (a + 2) * t * t * t - (a + 3) * t * t + 1
    } else if (t > 1 && t < 2) {
      res = a * t * t * t - 5 * a * t * t + 8 * a * t - 4 * a
    } else {
      res = 0
    }
    return res
  }

  return heightMap
}


export const getHeightMap = async () => {
  try {
    const mapbox = useMapbox()
    if (mapbox.value.settings.interpolation === 'bicubic') {
      return await getHeightMapBicubic()
    } else {
      return await getHeightMapBilinear()
    }
  } catch (error) {
    console.error('An error occurred in getHeightMap:', error)
    throw error
  }
}
