import type { Settings, Extent } from '~/types/types'
import type { FetchError } from 'ofetch'
import * as turf from '@turf/turf'
import { VectorTile, Point } from 'mapbox-vector-tile'
import { createSlopeTexture, createRadialTexture } from '~/utils/createTexture'
import { useFetchVectorTiles } from '~/composables/useFetchTiles'
import { mapSpec } from '~/utils/const'
import RBush from 'rbush'

/**
 * When drawing a slope, if a line segment from another feature overlaps,
 * it will be treated as an estuary or a connecting part, and the slope will be skipped.
 */

/** */

type T = {
  data: Blob | undefined
  error: FetchError<any> | undefined
}

interface BBoxItem extends RBush.BBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
  geom: turf.Geometry
  id: number
}

const isEqual = (a: Point, b: Point) => {
  return (a.x === b.x && a.y === b.y)
}

const isInside = (point: Point) => {
  const min = 0
  const max = 4096
  return !(point.x < min || point.x > max || point.y < min || point.y > max)
}

const isEitherInside = (a: Point, b: Point) => {
  return isInside(a) || isInside(b)
}

const decodeData = (arr: Uint8ClampedArray) => {
  const arrLength = arr.length / 4
  const elevs = new Float32Array(arrLength)
  let arrIndex = 0
  for (let i = 0; i < elevs.length; i++) {
    elevs[i] = arr[arrIndex] / 255
    arrIndex += 4
  }
  return elevs
}

const getWaterTree = (tile: VectorTile) => {
  const polygonTree = new RBush<BBoxItem>()
  const lineTree = new RBush<BBoxItem>()
  const waterPolygons: BBoxItem[] = []
  const waterLines: BBoxItem[] = []

  if (tile.layers.water) {
    for (let i = 0; i < tile.layers.water.length; i++) {
      const feature = tile.layers.water.feature(i)
      const polygonGeo = feature.asPolygons() as Point[][][]
      const lineGeo = feature.loadGeometry()
      const polygonArray = polygonGeo.map(polygon => polygon.map(line => line.map(point => [point.x, point.y] as turf.helpers.Position)))

      for (let m = 0; m < polygonGeo.length; m++) {
        for (let n = 0; n < polygonGeo[m].length; n++) {
          const polygon = turf.polygon([polygonArray[m][n]])
          const bbox = turf.bbox(polygon)
          const item: BBoxItem = {
            minX: bbox[0],
            minY: bbox[1],
            maxX: bbox[2],
            maxY: bbox[3],
            geom: polygon.geometry,
            id: (feature.properties.id ?? 0) as number,
          }
          waterPolygons.push(item)
        }
      }

      let index = 0
      for (let m = 0; m < lineGeo.length; m++) {
        for (let n = 0; n < lineGeo[m].length - 1; n++) {
          const line = turf.lineString([[lineGeo[m][n].x, lineGeo[m][n].y], [lineGeo[m][n + 1].x, lineGeo[m][n + 1].y]])
          const bbox = turf.bbox(line)
          const item: BBoxItem = {
            minX: bbox[0],
            minY: bbox[1],
            maxX: bbox[2],
            maxY: bbox[3],
            geom: line.geometry,
            id: (feature.properties.id ?? index) as number,
          }
          waterLines.push(item)
        }
      }
      index++
    }

    polygonTree.load(waterPolygons)
    lineTree.load(waterLines)
  }
  return { polygonTree, lineTree }
}

const clearCanvas = (ctx: OffscreenCanvasRenderingContext2D) => {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.canvas.width = 0
  ctx.canvas.height = 0
}

const drawPoint = (src: OffscreenCanvasRenderingContext2D, dst: OffscreenCanvasRenderingContext2D, point: Point) => {
  if (isInside(point)) {
    dst.drawImage(
      src.canvas,
      point.x - src.canvas.width / 2,
      point.y - src.canvas.height / 2,
      src.canvas.width,
      src.canvas.height,
    )
  }
}

const drawPath = (ctx: OffscreenCanvasRenderingContext2D, path: Point[]) => {
  if (isEqual(path[0], path.at(-1)!)) {
    path.pop()
  }
  ctx.beginPath()
  ctx.moveTo(path[0].x, path[0].y)
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i].x, path[i].y)
  }
  ctx.closePath()
  return ctx
}

const drawSlope = (
  lineSrc: OffscreenCanvasRenderingContext2D,
  lineDst: OffscreenCanvasRenderingContext2D,
  cornerSrc: OffscreenCanvasRenderingContext2D,
  cornerDst: OffscreenCanvasRenderingContext2D,
  id: number,
  points: Point[],
  tree: { polygonTree: RBush<BBoxItem>, lineTree: RBush<BBoxItem> },
) => {
  if (!isEqual(points[0], points.at(-1)!)) {
    points.push(points[0])
  }
  for (let i = 0; i < points.length - 1; i++) {
    if (isEitherInside(points[i], points[i + 1])) {
      const lineSegment = turf.lineString([[points[i].x, points[i].y], [points[i + 1].x, points[i + 1].y]])
      const bbox = turf.bbox(lineSegment)

      const potentialPolygons = tree.polygonTree.search({
        minX: bbox[0],
        minY: bbox[1],
        maxX: bbox[2],
        maxY: bbox[3],
      })
      const potentialLines = tree.lineTree.search({
        minX: bbox[0],
        minY: bbox[1],
        maxX: bbox[2],
        maxY: bbox[3],
      })

      // Skip if the line segment is included in another Polygon or is the same as a line segment in another Polygon.
      let shouldSkip = false
      for (const waterPolygon of potentialPolygons) {
        if (turf.booleanContains(waterPolygon.geom, lineSegment.geometry) && (id !== waterPolygon.id)) {
          shouldSkip = true
          break
        }
      }
      if (!shouldSkip) {
        for (const waterLine of potentialLines) {
          if (turf.booleanEqual(lineSegment.geometry, waterLine.geom) && (id !== waterLine.id)) {
            shouldSkip = true
            break
          }
        }
      }

      if (!shouldSkip) {
        drawPoint(cornerSrc, cornerDst, new Point(points[i].x, points[i].y))
        drawPoint(cornerSrc, cornerDst, new Point(points[i + 1].x, points[i + 1].y))

        const vecX = points[i + 1].x - points[i].x
        const vecY = points[i + 1].y - points[i].y
        const length = Math.sqrt(vecX * vecX + vecY * vecY)
        const theta = Math.atan2(vecY, vecX)
        const dx = points[i].x + vecX / 2
        const dy = points[i].y + vecY / 2
        lineDst.save()
        lineDst.translate(dx, dy)
        lineDst.rotate(theta)
        lineDst.drawImage(
          lineSrc.canvas,
          -length / 2,
          -lineSrc.canvas.height / 2,
          length,
          lineSrc.canvas.height,
        )
        lineDst.restore()
      }
    }
  }
}

/**
 * Get heightmap in Float32Array. Also returns ImageBitmap for debugging.\
 * The returned image size is increased by 200px to account for edge processing and consistency with the heightmap.
 * @param mapType
 * @param settings
 * @param extent rotated extent
 * @param mapPixels the number of pixels corresponding to extent, excluding the correction part and including padding
 * @param unitSize distance per 1px
 * @param includeOcean a flag for whether to include the ocean in the drawing.
 * @param isDebug default false
 * @return Promise\<Float32Array, ImageBitmap\>
 */

export const getWaterMap = async (
  settings: Settings,
  extent: Extent,
  mapPixels: number,
  unitSize: number,
  includeOcean: boolean,
  pixelsPerTile: number,
  isDebug: boolean,
  onTotal: (total: number) => void,
  onProgress: () => void,
) => {
  try {
    const waterCtx = new OffscreenCanvas(0, 0).getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D
    const waterSideCtx = new OffscreenCanvas(0, 0).getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D
    const waterWayCtx = new OffscreenCanvas(0, 0).getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D
    const littCtx = new OffscreenCanvas(0, 0).getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D
    const littCornerCtx = new OffscreenCanvas(0, 0).getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D
    const ripaCtx = new OffscreenCanvas(0, 0).getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D
    const ripaCornerCtx = new OffscreenCanvas(0, 0).getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D

    const side = Math.sqrt((extent.topright.x - extent.bottomleft.x) ** 2 + (extent.topright.y - extent.bottomleft.y) ** 2) / Math.SQRT2

    const zoom = Math.ceil(Math.log2(mapPixels / side)) + settings.waterside
    const scale = mapPixels / (side * (2 ** zoom))

    const minX = Math.min(extent.topleft.x, extent.topright.x, extent.bottomleft.x, extent.bottomright.x)
    const maxX = Math.max(extent.topleft.x, extent.topright.x, extent.bottomleft.x, extent.bottomright.x)

    const minY = Math.min(extent.topleft.y, extent.topright.y, extent.bottomleft.y, extent.bottomright.y)
    const maxY = Math.max(extent.topleft.y, extent.topright.y, extent.bottomleft.y, extent.bottomright.y)

    const tileX0 = Math.floor(minX * (2 ** zoom) / pixelsPerTile)
    const tileY0 = Math.floor(minY * (2 ** zoom) / pixelsPerTile)
    const tileX1 = Math.floor(maxX * (2 ** zoom) / pixelsPerTile)
    const tileY1 = Math.floor(maxY * (2 ** zoom) / pixelsPerTile)

    const _centerX = extent.centerX * (2 ** zoom)
    const _centerY = extent.centerY * (2 ** zoom)

    const offsetX = _centerX - tileX0 * pixelsPerTile
    const offsetY = _centerY - tileY0 * pixelsPerTile

    // input padding is 220 but output padding is 200
    const resultPixels = mapPixels + mapSpec[settings.gridInfo].correction - 20

    const tileCount = Math.max(tileX1 - tileX0 + 1, tileY1 - tileY0 + 1)
    const halfMapSize = resultPixels / 2
    const theta = -settings.angle * Math.PI / 180

    // setup waterCtx
    waterCtx.canvas.width = resultPixels
    waterCtx.canvas.height = resultPixels
    waterCtx.fillStyle = '#FFFFFF'
    waterCtx.fillRect(0, 0, resultPixels, resultPixels)
    waterCtx.translate(halfMapSize, halfMapSize)
    waterCtx.rotate(theta)
    waterCtx.scale(scale, scale)
    waterCtx.translate(-offsetX, -offsetY)
    waterCtx.globalCompositeOperation = 'source-over'

    // setup waterSideCtx
    waterSideCtx.canvas.width = resultPixels
    waterSideCtx.canvas.height = resultPixels
    waterSideCtx.fillStyle = '#000000'
    waterSideCtx.fillRect(0, 0, resultPixels, resultPixels)
    waterSideCtx.translate(halfMapSize, halfMapSize)
    waterSideCtx.rotate(theta)
    waterSideCtx.scale(scale, scale)
    waterSideCtx.translate(-offsetX, -offsetY)
    waterSideCtx.globalCompositeOperation = 'lighten'

    // setup waterWayCtx
    waterWayCtx.canvas.width = resultPixels
    waterWayCtx.canvas.height = resultPixels
    waterWayCtx.fillStyle = '#FFFFFF'
    waterWayCtx.fillRect(0, 0, resultPixels, resultPixels)
    waterWayCtx.translate(halfMapSize, halfMapSize)
    waterWayCtx.rotate(theta)
    waterWayCtx.scale(scale, scale)
    waterWayCtx.translate(-offsetX, -offsetY)
    waterWayCtx.globalCompositeOperation = 'darken'
    waterWayCtx.lineJoin = 'round'

    // create texture
    const littPixelSize = Math.max(settings.littoral / (unitSize * 1000) / scale, 1)
    createSlopeTexture(settings.littArray, littPixelSize, littCtx)
    createRadialTexture(settings.littArray, littPixelSize, littCornerCtx)
    const ripaPixelSize = Math.max(settings.riparian / (unitSize * 1000) / scale, 1)
    createSlopeTexture(settings.littArray, ripaPixelSize, ripaCtx)
    createRadialTexture(settings.littArray, ripaPixelSize, ripaCornerCtx)

    const totalTiles = tileCount * tileCount
    onTotal(totalTiles)
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
            waterCtx.save()
            waterCtx.translate(transX, transY)
            waterCtx.beginPath()
            waterCtx.rect(-2, -2, pixelsPerTile + 4, pixelsPerTile + 4)
            waterCtx.clip()
            waterSideCtx.save()
            waterSideCtx.translate(transX, transY)
            waterWayCtx.save()
            waterWayCtx.translate(transX, transY)
            waterWayCtx.beginPath()
            waterWayCtx.rect(-2, -2, pixelsPerTile + 4, pixelsPerTile + 4)
            waterWayCtx.clip()
            const waterTree = getWaterTree(tile)
            // draw start
            if (tile.layers.water) {
              for (let i = 0; i < tile.layers.water.length; i++) {
                const feature = tile.layers.water.feature(i)
                const geo = feature.asPolygons() as Point[][][]
                const _id = (feature.properties.id ?? 0) as number
                // draw water area & inner lands
                if (feature.properties.class !== 'ocean' || includeOcean) {
                  for (let j = 0; j < geo.length; j++) {
                    waterCtx.fillStyle = '#000000'
                    const outerPath = geo[j][0]
                    drawPath(waterCtx, outerPath).fill()
                    waterCtx.fillStyle = '#FFFFFF'
                    for (let m = 1; m < geo[j].length; m++) {
                      const innerPath = geo[j][m]
                      drawPath(waterCtx, innerPath).fill()
                    }
                  }
                }
                if (feature.properties.class === 'ocean' && includeOcean) {
                // draw littoral
                  for (let j = 0; j < geo.length; j++) {
                    for (let m = 0; m < geo[j].length; m++) {
                      const path = []
                      for (let n = 0; n < geo[j][m].length; n++) {
                        const point = new Point(geo[j][m][n].x, geo[j][m][n].y)
                        path.push(point)
                      }
                      drawSlope(littCtx, waterSideCtx, littCornerCtx, waterSideCtx, _id, path, waterTree)
                    }
                  }
                } else {
                // draw riparian
                  for (let j = 0; j < geo.length; j++) {
                    for (let m = 0; m < geo[j].length; m++) {
                      const path = []
                      for (let n = 0; n < geo[j][m].length; n++) {
                        const point = new Point(geo[j][m][n].x, geo[j][m][n].y)
                        path.push(point)
                      }
                      drawSlope(ripaCtx, waterSideCtx, ripaCornerCtx, waterSideCtx, _id, path, waterTree)
                    }
                  }
                }
              }
            }
            // draw water way
            if (tile.layers.waterway) {
              waterWayCtx.filter = 'blur(1px)'
              waterWayCtx.lineWidth = Math.max(settings.streamWidth / (unitSize * 1000) / scale, 1)
              waterWayCtx.strokeStyle = '#000000'
              for (let i = 0; i < tile.layers.waterway.length; i++) {
                const feature = tile.layers.waterway.feature(i)
                const geo = feature.loadGeometry()
                for (let m = 0; m < geo.length; m++) {
                  waterWayCtx.beginPath()
                  waterWayCtx.moveTo(geo[m][0].x, geo[m][0].y)
                  for (let n = 1; n < geo[m].length; n++) {
                    waterWayCtx.lineTo(geo[m][n].x, geo[m][n].y)
                  }
                  waterWayCtx.stroke()
                }
              }
            }
            waterCtx.restore()
            waterSideCtx.restore()
            waterWayCtx.restore()
            onProgress()
          }
        }
      })
      await Promise.all(tilePromises)
    }
    await processTiles(tileList)

    const resultWaterCtx = new OffscreenCanvas(resultPixels, resultPixels).getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D
    resultWaterCtx.drawImage(waterCtx.canvas, 0, 0)
    resultWaterCtx.globalCompositeOperation = 'lighten'
    resultWaterCtx.drawImage(waterSideCtx.canvas, 0, 0)

    const resultWaterImageData = resultWaterCtx.getImageData(0, 0, resultPixels, resultPixels)
    const waterWayImageData = waterWayCtx.getImageData(0, 0, resultPixels, resultPixels)

    const waterMap = decodeData(resultWaterImageData.data)
    const waterWayMap = decodeData(waterWayImageData.data)

    clearCanvas(waterCtx)
    clearCanvas(waterSideCtx)
    clearCanvas(littCtx)
    clearCanvas(littCornerCtx)

    if (isDebug) {
      const waterMapImage = resultWaterCtx.canvas.transferToImageBitmap()
      const waterWayMapImage = waterWayCtx.canvas.transferToImageBitmap()

      return {
        waterMap,
        waterWayMap,
        waterMapImage,
        waterWayMapImage,
      }
    }
    else {
      clearCanvas(resultWaterCtx)
      clearCanvas(waterWayCtx)

      return {
        waterMap,
        waterWayMap,
      }
    }
  } catch (error) {
    console.error('An error occurred in getWaterMap:', error)
    throw error
  }
}
