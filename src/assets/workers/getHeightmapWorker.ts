import type { FetchError } from 'ofetch'
import { getExtentInWorldCoords } from '~/utils/getExtent'
import type { GenerateMapOption } from '~/types/types'
import { decodeElevation } from '~/utils/elevation'
import { mapSpec } from '~/utils/const'
import { useFetchTerrainTiles } from '~/composables/useFetchTiles'
import { decode } from '@jsquash/webp'
import initPng, { decode_png } from '~~/png_lib/pkg'
// import { gaussianBlur } from '~/utils/filters'

type T = {
  data: Blob | undefined
  error: FetchError<any> | undefined
}

// bilinear interpolation ----------------------------------------------------------------------------

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
  const a = scale > 1 ? -1 : -0.5

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
        fy[0] * elevations[(y0 - 1) * tilePixels + x0] + fy[1] * elevations[y0 * tilePixels + x0] + fy[2] * elevations[(y0 + 1) * tilePixels + x0] + fy[3] * elevations[(y0 + 2) * tilePixels + x0],
        fy[0] * elevations[(y0 - 1) * tilePixels + x0 + 1] + fy[1] * elevations[y0 * tilePixels + x0 + 1] + fy[2] * elevations[(y0 + 1) * tilePixels + x0 + 1] + fy[3] * elevations[(y0 + 2) * tilePixels + x0 + 1],
        fy[0] * elevations[(y0 - 1) * tilePixels + x0 + 2] + fy[1] * elevations[y0 * tilePixels + x0 + 2] + fy[2] * elevations[(y0 + 1) * tilePixels + x0 + 2] + fy[3] * elevations[(y0 + 2) * tilePixels + x0 + 2],
      ]

      heightMap[y * resultPixels + x] = fx[0] * tmpVals[0] + fx[1] * tmpVals[1] + fx[2] * tmpVals[2] + fx[3] * tmpVals[3]
    }
  }

  function cubicFunc(t: number) {
    if (t < 1) {
      return (a + 2) * t * t * t - (a + 3) * t * t + 1
    } else if (t < 2) {
      return a * t * t * t - 5 * a * t * t + 8 * a * t - 4 * a
    } else {
      return 0
    }
  }

  return heightMap
}

class GetHeightmapWorker {
  private worker: Worker

  constructor() {
    this.worker = self as any
    self.onmessage = this.handleMessage.bind(this)
  }

  private clearCanvas(ctx: OffscreenCanvasRenderingContext2D) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.canvas.width = 0
    ctx.canvas.height = 0
  }

  private async handleMessage(e: MessageEvent<any>) {
    const message = e.data
    const canvas = new OffscreenCanvas(0, 0)
    const ctx = canvas.getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D
    const {
      mapType,
      settings,
      token,
      isDebug,
      resolution,
    } = message as GenerateMapOption
    const pixelsPerTile = 512
    const _correction = mapType === 'ocean' ? mapSpec[settings.gridInfo].correction : mapSpec[mapType].correction
    const _mapPixels = resolution! - _correction
    const unitSize = settings.size / _mapPixels
    const tmpMapPixels = Math.ceil(_mapPixels * Math.SQRT2 + 420)
    const tmpMapSize = tmpMapPixels * unitSize
    const extentOffset = mapType === 'cs2play' ? 0.375 : 0
    const { x0, y0, x1, y1, centerX, centerY } = getExtentInWorldCoords(settings.lng, settings.lat, tmpMapSize, extentOffset, pixelsPerTile)
    const side = x1 - x0
    const maxZoom = mapType === 'ocean' ? 7 : 14
    const zoom = Math.min(Math.ceil(Math.log2(tmpMapPixels / side)), maxZoom)
    const scale = (side * (2 ** zoom)) / tmpMapPixels
    const tileX0 = Math.floor(x0 * (2 ** zoom) / pixelsPerTile)
    const tileY0 = Math.floor(y0 * (2 ** zoom) / pixelsPerTile)
    const tileX1 = Math.floor(x1 * (2 ** zoom) / pixelsPerTile)
    const tileY1 = Math.floor(y1 * (2 ** zoom) / pixelsPerTile)
    const resultCenterX = centerX * (2 ** zoom)
    const resultCenterY = centerY * (2 ** zoom)
    const offsetX = resultCenterX - tileX0 * pixelsPerTile - _correction / 2
    const offsetY = resultCenterY - tileY0 * pixelsPerTile - _correction / 2
    const tileCount = Math.max(tileX1 - tileX0 + 1, tileY1 - tileY0 + 1)
    const tilePixels = tileCount * pixelsPerTile
    const resultPixels = resolution! + (mapType === 'cs2play' ? 0 : 200)

    canvas.width = tilePixels
    canvas.height = tilePixels
    ctx.clearRect(0, 0, tilePixels, tilePixels)
    ctx.fillStyle = 'rgb(1, 134, 160)'  // = 0m
    ctx.fillRect(0, 0, tilePixels, tilePixels)

    const tiles = new Array<Promise<T>>(tileCount * tileCount)
    const elevations = new Float32Array(tilePixels * tilePixels)
    if (mapType === 'ocean') {
      // await load()
    } else {
      await initPng()
    }
    // fetch tiles
    for (let y = 0; y < tileCount; y++) {
      for (let x = 0; x < tileCount; x++) {
        if (mapType === 'ocean') {
          tiles[y * tileCount + x] = useFetchOceanTiles(zoom, tileX0 + x, tileY0 + y, token!)
        } else {
          tiles[y * tileCount + x] = useFetchTerrainTiles(zoom, tileX0 + x, tileY0 + y, token!)
        }
      }
    }
    const tileList = await Promise.allSettled(tiles)

    const processTiles = async (list: PromiseSettledResult<T>[]) => {
      const tilePromises = list.map(async (tile, index) => {
        if (tile.status === 'fulfilled') {
          const blob = tile.value.data
          if (blob) {
            const arrBuffer = await blob.arrayBuffer()
            let byteArray: Uint8ClampedArray
            if (mapType === 'ocean') {
              const imgData = await decode(arrBuffer)
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
          }
        }
      })
      await Promise.all(tilePromises)
    }
    await processTiles(tileList)

    const result = settings.interpolation === 'bicubic'
      ? getHeightMapBicubic(elevations, resultPixels, tilePixels, settings.angle, scale, offsetX, offsetY, _correction)
      : getHeightMapBilinear(elevations, resultPixels, tilePixels, settings.angle, scale, offsetX, offsetY, _correction)

    if (isDebug) {
      const imageBitmap = canvas.transferToImageBitmap()
      this.worker.postMessage({ heightmap: result, heightmapImage: imageBitmap }, [result.buffer, imageBitmap])
    } else {
      this.clearCanvas(ctx)
      this.worker.postMessage({ heightmap: result, heightmapImage: null }, [result.buffer])
    }
  }
}

export default new GetHeightmapWorker()
