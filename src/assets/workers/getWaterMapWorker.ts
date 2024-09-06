import type { FetchError } from 'ofetch'
import { VectorTile, Point } from 'mapbox-vector-tile'
import { getExtentInWorldCoords } from '~/utils/getExtent'
import { createSlopeTexture, createRadialTexture } from '~/utils/createTexture'
import { useFetchVectorTiles } from '~/composables/useFetchTiles'
import { mapSpec } from '~/utils/const'
import type { GenerateMapOption } from '~/types/types'

type T = {
  data: Blob | undefined
  error: FetchError<any> | undefined
}

const isEqual = (a: Point, b: Point) => {
  return (a.x === b.x && a.y === b.y)
}

function isInside(point: Point) {
  const min = 0
  const max = 4096
  return !(point.x < min || point.x > max || point.y < min || point.y > max)
}

function isEitherInside(a: Point, b: Point) {
  return isInside(a) || isInside(b)
}

function decodeData(arr: Uint8ClampedArray) {
  const arrLength = arr.length / 4
  const elevs = new Float32Array(arrLength)
  let arrIndex = 0
  for (let i = 0; i < elevs.length; i++) {
    elevs[i] = arr[arrIndex] / 255
    arrIndex += 4
  }
  return elevs
}

class GetWaterMapWorker {
  private worker: Worker
  private waterCtx: OffscreenCanvasRenderingContext2D
  private waterSideCtx: OffscreenCanvasRenderingContext2D
  private waterWayCtx: OffscreenCanvasRenderingContext2D
  private littCtx: OffscreenCanvasRenderingContext2D
  private cornerCtx: OffscreenCanvasRenderingContext2D
  private littCtxHalfHeight = 0
  private cornerCtxHalfWidth = 0
  private cornerCtxHalfHeight = 0

  constructor() {
    this.worker = self as any
    this.waterCtx = new OffscreenCanvas(0, 0).getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D
    this.waterSideCtx = new OffscreenCanvas(0, 0).getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D
    this.waterWayCtx = new OffscreenCanvas(0, 0).getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D
    this.littCtx = new OffscreenCanvas(0, 0).getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D
    this.cornerCtx = new OffscreenCanvas(0, 0).getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D
    self.onmessage = this.handleMessage.bind(this)
  }

  private clearCanvas(ctx: OffscreenCanvasRenderingContext2D) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.canvas.width = 0
    ctx.canvas.height = 0
  }

  private drawPoint = (point: Point) => {
    if (isInside(point)) {
      this.waterSideCtx.drawImage(
        this.cornerCtx.canvas,
        point.x - this.cornerCtxHalfWidth,
        point.y - this.cornerCtxHalfHeight,
        this.cornerCtx.canvas.width,
        this.cornerCtx.canvas.height,
      )
    }
  }

  private drawPath = (path: Point[]) => {
    if (isEqual(path[0], path.at(-1)!)) {
      path.pop()
    }
    this.waterCtx.beginPath()
    this.waterCtx.moveTo(path[0].x, path[0].y)
    for (let i = 1; i < path.length; i++) {
      this.waterCtx.lineTo(path[i].x, path[i].y)
    }
    this.waterCtx.closePath()
    return this.waterCtx
  }

  private drawSlope = (points: Point[]) => {
    if (!isEqual(points[0], points.at(-1)!)) {
      points.push(points[0])
    }
    for (let i = 0; i < points.length - 1; i++) {
      if (isEitherInside(points[i], points[i + 1])) {
        const vecX = points[i + 1].x - points[i].x
        const vecY = points[i + 1].y - points[i].y
        const length = Math.sqrt(vecX * vecX + vecY * vecY)
        const theta = Math.atan2(vecY, vecX)
        const dx = points[i].x + vecX / 2
        const dy = points[i].y + vecY / 2
        this.waterSideCtx.save()
        this.waterSideCtx.translate(dx, dy)
        this.waterSideCtx.rotate(theta)
        this.waterSideCtx.drawImage(
          this.littCtx.canvas,
          -length / 2,
          -this.littCtxHalfHeight,
          length,
          this.littCtx.canvas.height,
        )
        this.waterSideCtx.restore()
      }
    }
  }

  private async handleMessage(e: MessageEvent<any>) {
    const message = e.data
    const {
      mapType,
      settings,
      includeOcean,
      isDebug,
      resolution,
    } = message as GenerateMapOption

    const pixelsPerTile = 4096
    const _correction = mapSpec[mapType].correction
    const _mapPixels = resolution! - _correction
    const unitSize = settings.size / _mapPixels
    const tmpMapPixels = Math.ceil(_mapPixels * Math.SQRT2 + 420)
    const tmpMapSize = tmpMapPixels * unitSize
    const extentOffset = mapType === 'cs2play' ? 0.375 : 0
    const { x0, y0, x1, y1, centerX, centerY } = getExtentInWorldCoords(settings.lng, settings.lat, tmpMapSize, extentOffset, pixelsPerTile)
    const side = x1 - x0
    const zoom = Math.ceil(Math.log2(tmpMapPixels / side)) + settings.waterside
    const scale = tmpMapPixels / (side * (2 ** zoom))
    const tileX0 = Math.floor(x0 * (2 ** zoom) / pixelsPerTile)
    const tileY0 = Math.floor(y0 * (2 ** zoom) / pixelsPerTile)
    const tileX1 = Math.floor(x1 * (2 ** zoom) / pixelsPerTile)
    const tileY1 = Math.floor(y1 * (2 ** zoom) / pixelsPerTile)
    const resultCenterX = centerX * (2 ** zoom)
    const resultCenterY = centerY * (2 ** zoom)
    const offsetX = resultCenterX - tileX0 * pixelsPerTile
    const offsetY = resultCenterY - tileY0 * pixelsPerTile
    const tileCount = Math.max(tileX1 - tileX0 + 1, tileY1 - tileY0 + 1)
    const padding = mapType === 'cs2play' ? 0 : 200
    const resultPixels = resolution! + padding
    const halfMapSize = (_mapPixels + padding) / 2
    const theta = -settings.angle * Math.PI / 180

    // setup waterCtx
    this.waterCtx.canvas.width = resultPixels
    this.waterCtx.canvas.height = resultPixels
    this.waterCtx.fillStyle = '#FFFFFF'
    this.waterCtx.fillRect(0, 0, resultPixels, resultPixels)
    this.waterCtx.translate(halfMapSize, halfMapSize)
    this.waterCtx.rotate(theta)
    this.waterCtx.scale(scale, scale)
    this.waterCtx.translate(-offsetX, -offsetY)
    this.waterCtx.globalCompositeOperation = 'source-over'

    // setup waterSideCtx
    this.waterSideCtx.canvas.width = resultPixels
    this.waterSideCtx.canvas.height = resultPixels
    this.waterSideCtx.fillStyle = '#000000'
    this.waterSideCtx.fillRect(0, 0, resultPixels, resultPixels)
    this.waterSideCtx.translate(halfMapSize, halfMapSize)
    this.waterSideCtx.rotate(theta)
    this.waterSideCtx.scale(scale, scale)
    this.waterSideCtx.translate(-offsetX, -offsetY)
    this.waterSideCtx.globalCompositeOperation = 'lighten'

    // setup waterWayCtx
    this.waterWayCtx.canvas.width = resultPixels
    this.waterWayCtx.canvas.height = resultPixels
    this.waterWayCtx.fillStyle = '#FFFFFF'
    this.waterWayCtx.fillRect(0, 0, resultPixels, resultPixels)
    this.waterWayCtx.translate(halfMapSize, halfMapSize)
    this.waterWayCtx.rotate(theta)
    this.waterWayCtx.scale(scale, scale)
    this.waterWayCtx.translate(-offsetX, -offsetY)
    this.waterWayCtx.globalCompositeOperation = 'darken'
    this.waterWayCtx.lineJoin = 'round'

    // create texture
    const pixelSize = Math.max(settings.littoral / (unitSize * 1000) / scale, 1)
    createSlopeTexture(mapType, settings, pixelSize, this.littCtx)
    this.littCtxHalfHeight = this.littCtx.canvas.height / 2
    createRadialTexture(mapType, settings, pixelSize, this.cornerCtx)
    this.cornerCtxHalfWidth = this.cornerCtx.canvas.width / 2
    this.cornerCtxHalfHeight = this.cornerCtx.canvas.height / 2

    const totalTiles = tileCount * tileCount
    this.worker.postMessage({ type: 'total', number: totalTiles })

    const tiles = new Array<Promise<T>>(totalTiles)

    // fetch tiles
    for (let i = 0; i < tileCount; i++) {
      for (let j = 0; j < tileCount; j++) {
        tiles[j + i * tileCount] = useFetchVectorTiles(zoom, tileX0 + j, tileY0 + i, settings.accessTokenMT!)
      }
    }
    const tileList = await Promise.allSettled(tiles)

    const processTiles = async (list: PromiseSettledResult<T>[]) => {
      const tilePromises = list.map(async (tileResult, index) => {
        if (tileResult.status === 'fulfilled') {
          const arrayBuffer = await tileResult.value.data?.arrayBuffer()
          if (arrayBuffer) {
            // set position of tiles
            const tile = new VectorTile(new Uint8Array(arrayBuffer))
            const transX = Math.floor(index % tileCount) * pixelsPerTile
            const transY = Math.floor(index / tileCount) * pixelsPerTile

            this.waterCtx.save()
            this.waterCtx.translate(transX, transY)
            this.waterCtx.beginPath()
            this.waterCtx.rect(-2, -2, pixelsPerTile + 4, pixelsPerTile + 4)
            this.waterCtx.clip()

            this.waterSideCtx.save()
            this.waterSideCtx.translate(transX, transY)

            this.waterWayCtx.save()
            this.waterWayCtx.translate(transX, transY)
            this.waterWayCtx.beginPath()
            this.waterWayCtx.rect(-2, -2, pixelsPerTile + 4, pixelsPerTile + 4)
            this.waterWayCtx.clip()

            // draw start
            if (tile.layers.water) {
              for (let i = 0; i < tile.layers.water.length; i++) {
                const feature = tile.layers.water.feature(i)
                const geo = feature.asPolygons() as Point[][][]

                if (includeOcean || feature.properties.class !== 'ocean') {
                  // draw water area & inner lands
                  for (let j = 0; j < geo.length; j++) {
                    this.waterCtx.fillStyle = '#000000'
                    const outerPath = geo[j][0]
                    this.drawPath(outerPath).fill()
                    this.waterCtx.fillStyle = '#FFFFFF'
                    for (let m = 1; m < geo[j].length; m++) {
                      const innerPath = geo[j][m]
                      this.drawPath(innerPath).fill()
                    }
                  }
                }

                if (includeOcean && feature.properties.class === 'ocean') {
                  // draw littoral
                  for (let j = 0; j < geo.length; j++) {
                    for (let m = 0; m < geo[j].length; m++) {
                      const path = []
                      for (let n = 0; n < geo[j][m].length; n++) {
                        const point = new Point(geo[j][m][n].x, geo[j][m][n].y)
                        path.push(point)
                        this.drawPoint(point)
                      }
                      this.drawSlope(path)
                    }
                  }
                }
              }
            }

            // draw water way
            if (tile.layers.waterway) {
              for (let i = 0; i < tile.layers.waterway.length; i++) {
                const feature = tile.layers.waterway.feature(i)
                const geo = feature.loadGeometry()
                this.waterWayCtx.lineWidth = Math.max(settings.streamWidth / (unitSize * 1000) / scale, 1)
                this.waterWayCtx.strokeStyle = '#000000'

                for (let m = 0; m < geo.length; m++) {
                  this.waterWayCtx.beginPath()
                  this.waterWayCtx.moveTo(geo[m][0].x, geo[m][0].y)

                  for (let n = 1; n < geo[m].length; n++) {
                    this.waterWayCtx.lineTo(geo[m][n].x, geo[m][n].y)
                  }
                  this.waterWayCtx.stroke()
                }
              }
            }
            this.waterCtx.restore()
            this.waterSideCtx.restore()
            this.waterWayCtx.restore()
          }
          this.worker.postMessage({ type: 'progress' })
        }
      })
      await Promise.all(tilePromises)
    }
    await processTiles(tileList)

    const resultWaterCtx = new OffscreenCanvas(resultPixels, resultPixels).getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D
    resultWaterCtx.drawImage(this.waterCtx.canvas, 0, 0)
    resultWaterCtx.globalCompositeOperation = 'lighten'
    resultWaterCtx.drawImage(this.waterSideCtx.canvas, 0, 0)

    const resultWaterImageData = resultWaterCtx.getImageData(0, 0, resultPixels, resultPixels)
    const waterWayImageData = this.waterWayCtx.getImageData(0, 0, resultPixels, resultPixels)

    const waterMap = decodeData(resultWaterImageData.data)
    const waterWayMap = decodeData(waterWayImageData.data)

    if (isDebug) {
      this.clearCanvas(this.waterCtx)
      const waterMapImage = resultWaterCtx.canvas.transferToImageBitmap()
      const waterWayMapImage = this.waterWayCtx.canvas.transferToImageBitmap()
      const littImage = this.littCtx.canvas.transferToImageBitmap()
      const cornerImage = this.cornerCtx.canvas.transferToImageBitmap()
      this.worker.postMessage({
        waterMap,
        waterWayMap,
        waterMapImage,
        waterWayMapImage,
        littImage,
        cornerImage,
      }, [
        waterMap.buffer,
        waterWayMap.buffer,
        waterMapImage,
        waterWayMapImage,
        littImage,
        cornerImage,
      ])
    }
    else {
      this.clearCanvas(resultWaterCtx)
      this.clearCanvas(this.waterCtx)
      this.clearCanvas(this.waterSideCtx)
      this.clearCanvas(this.waterWayCtx)
      this.clearCanvas(this.littCtx)
      this.clearCanvas(this.cornerCtx)
      this.worker.postMessage({
        waterMap,
        waterWayMap,
      }, [
        waterMap.buffer,
        waterWayMap.buffer,
      ])
    }
  }
}

export default new GetWaterMapWorker()
