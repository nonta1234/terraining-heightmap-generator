import { FetchError } from 'ofetch'
import { VectorTile, Point } from 'mapbox-vector-tile'
import type { MapType } from '~/types/types'

type T = {
  data: globalThis.Ref<Blob | null>;
  error: globalThis.Ref<FetchError<any> | null>;
}

type Position = {
  x: number;
  y: number;
}


export const getWaterMap = async (mapType: MapType = 'cs1') => {
  const mapbox = useMapbox()
  const factor = mapType === 'cs2play' ? 4 : 1
  let resultPixels = mapSpec[mapType].mapPixels + 4 * factor                  // cs1: 1085px    cs2: 4100px    cs2play: 16400px -> 4100px
  let tmpMapPixels = Math.ceil((resultPixels + 1 * factor) * Math.SQRT2)      // cs1: 1086√2px  cs2: 4101√2px  cs2play: 16404√2px
  const fasesOffset = (mapType === 'cs2' || mapType === 'cs2play') ? 0 : 1
  const mapFases = mapSpec[mapType].mapPixels - fasesOffset                   // cs1: 1080px    cs2: 4096px    cs2play: 16384px
  const waterAreaSize = mapbox.value.settings.size / mapFases * tmpMapPixels
  const pixelsPerTile = 4096                                                  // number of pixels in vector-tiles
  if (mapType === 'cs2play') {
    resultPixels = resultPixels / 4
  }

  const { topleft, bottomright } = getExtent(
    mapbox.value.settings.lng,
    mapbox.value.settings.lat,
    waterAreaSize / 2,
    waterAreaSize / 2,
  )

  let referenceLat: number

  if (Math.abs(topleft[1]) >= Math.abs(bottomright[1])) {
    referenceLat = topleft[1]
  } else {
    referenceLat = bottomright[1]
  }

  const zoom = Math.ceil(calculateZoomLevel(referenceLat, waterAreaSize, tmpMapPixels, pixelsPerTile)) + fasesOffset

  let tileX0 = lng2tile(topleft[0], zoom)
  let tileY0 = lat2tile(topleft[1], zoom)
  const tileX1 = lng2tile(bottomright[0], zoom)
  const tileY1 = lat2tile(bottomright[1], zoom)
  let tileCount = Math.max(tileX1 - tileX0 + 1, tileY1 - tileY0 + 1)

  const posX0 = lng2pixel(topleft[0], zoom, pixelsPerTile)
  const posY0 = lat2pixel(topleft[1], zoom, pixelsPerTile)
  const posX1 = lng2pixel(bottomright[0], zoom, pixelsPerTile)
  const posY1 = lat2pixel(bottomright[1], zoom, pixelsPerTile)

  const mapWidth = posX1 - posX0
  const mapHeight = posY1 - posY0

  const mapPixelsOnTile = Math.sqrt(mapWidth * mapWidth + mapHeight * mapHeight) / Math.SQRT2
  const scale = tmpMapPixels / mapPixelsOnTile

  let playAreaX0 = posX0
  let playAreaY0 = posY0

  if (mapType === 'cs2play') {
    playAreaX0 = posX0 + (mapPixelsOnTile / 8 * 3)
    tileX0 = pixel2tile(playAreaX0, pixelsPerTile)
    playAreaY0 = posY0 + (mapPixelsOnTile / 8 * 3)
    tileY0 = pixel2tile(playAreaY0, pixelsPerTile)

    const playAreaX1 = posX0 + (mapPixelsOnTile / 8 * 5)
    const playTileX1 = pixel2tile(playAreaX1, pixelsPerTile)
    const playAreaY1 = posY0 + (mapPixelsOnTile / 8 * 5)
    const playTileY1 = pixel2tile(playAreaY1, pixelsPerTile)

    tmpMapPixels = Math.ceil((resultPixels + 1 * factor) * Math.SQRT2)
    tileCount = Math.max(playTileX1 - tileX0 + 1, playTileY1 - tileY0 + 1)
  }

  const tilePosX = tileX0 * pixelsPerTile
  const tilePosY = tileY0 * pixelsPerTile

  const offsetX = (mapType === 'cs2play' ? playAreaX0 : posX0) - tilePosX
  const offsetY = (mapType === 'cs2play' ? playAreaY0 : posY0) - tilePosY

  const minLength = mapbox.value.settings.size / mapFases
  const length = Math.max(mapbox.value.settings.littoral, minLength)
  const lineWidth = length / (minLength / 2)

  const tiles = new Array<Promise<T>>(Math.pow(tileCount, 2))

  console.log('watermap:', zoom, tileX0, tileY0, tileCount, tmpMapPixels, scale, offsetX, offsetY)

  // waterCanvas setting -----------------------------------------------------------------------------

  const waterCanvas = ref<HTMLCanvasElement>()
  waterCanvas.value = document.createElement('canvas')
  waterCanvas.value.width = tmpMapPixels
  waterCanvas.value.height = tmpMapPixels

  const waterCtx = waterCanvas.value!.getContext('2d', { storage: 'discardable', willReadFrequently: true }) as CanvasRenderingContext2D
  waterCtx.globalCompositeOperation = 'source-over'
  waterCtx.fillStyle = '#FFFFFF'
  waterCtx.fillRect(0, 0, waterCanvas.value.width, waterCanvas.value.height)

  console.log(waterCanvas)

  // littCanvas setting ------------------------------------------------------------------------------

  const littCanvas = ref<HTMLCanvasElement>()
  littCanvas.value = document.createElement('canvas')
  littCanvas.value.width = tmpMapPixels
  littCanvas.value.height = tmpMapPixels

  const littCtx = littCanvas.value!.getContext('2d', { storage: 'discardable', willReadFrequently: true }) as CanvasRenderingContext2D
  littCtx.fillStyle = '#000000'
  littCtx.fillRect(0, 0, littCanvas.value.width, littCanvas.value.height)
  littCtx.globalCompositeOperation = 'lighten'

  console.log(littCanvas)

  // tmplittCanvas setting ---------------------------------------------------------------------------

  const tmpLittCanvas = ref<HTMLCanvasElement>()
  tmpLittCanvas.value = document.createElement('canvas')
  tmpLittCanvas.value.width = tmpMapPixels
  tmpLittCanvas.value.height = tmpMapPixels

  const tmpLittCtx = tmpLittCanvas.value!.getContext('2d', { storage: 'discardable', willReadFrequently: true }) as CanvasRenderingContext2D
  tmpLittCtx.globalCompositeOperation = 'lighten'

  console.log(tmpLittCanvas)

  // waterwayCanvas setting --------------------------------------------------------------------------

  const waterwayCanvas = ref<HTMLCanvasElement>()
  waterwayCanvas.value = document.createElement('canvas')
  waterwayCanvas.value.width = tmpMapPixels
  waterwayCanvas.value.height = tmpMapPixels

  const waterwayCtx = waterwayCanvas.value!.getContext('2d', { storage: 'discardable', willReadFrequently: true }) as CanvasRenderingContext2D
  waterwayCtx.fillStyle = '#FFFFFF'
  waterwayCtx.fillRect(0, 0, waterwayCanvas.value.width, waterwayCanvas.value.height)
  waterwayCtx.strokeStyle = '#000000'
  waterwayCtx.lineWidth = mapbox.value.settings.gridInfo === 'cs2play' ? 2 : 1

  console.log(waterwayCanvas)

  // fetch tiles & draw ------------------------------------------------------------------------------

  for (let i = 0; i < tileCount; i++) {
    for (let j = 0; j < tileCount; j++) {
      tiles[j + i * tileCount] = useFetchVectorTiles(zoom, tileX0 + j, tileY0 + i)
    }
  }

  const tileList = await Promise.allSettled(tiles)
  await processTiles(tileList)

  waterCtx.globalCompositeOperation = 'lighten'
  waterCtx.drawImage(littCanvas.value, 0, 0)


  // functions ---------------------------------------------------------------------------------------

  function getColorFromValue(value: number) {
    const intValue = Math.min(255, Math.round(value * 255))
    const hex = intValue.toString(16).padStart(2, '0')
    const colorCode = '#' + hex + hex + hex
    return colorCode
  }


  async function processTiles(list: PromiseSettledResult<T>[]) {
    const tilePromises = list.map(async (tile, index) => {
      if (tile.status === 'fulfilled') {
        const arrayBuffer = await tile.value.data.value?.arrayBuffer()
        if (arrayBuffer) {
          const tile = new VectorTile(new Uint8Array(arrayBuffer))

          const transX = Math.floor(index % tileCount) * pixelsPerTile - offsetX
          const transY = Math.floor(index / tileCount) * pixelsPerTile - offsetY

          if (tile.layers.water) {
            const geo = tile.layers.water.feature(0).asPolygons() as Point[][][]
            console.log(geo.length)

            tmpLittCtx.clearRect(0, 0, tmpLittCanvas.value!.width, tmpLittCanvas.value!.height)
            tmpLittCtx.fillStyle = '#000000'
            tmpLittCtx.fillRect(0, 0, tmpLittCanvas.value!.width, tmpLittCanvas.value!.height)

            for (let i = 0; i < geo.length; i++) {
              for (let m = 0; m < geo[i].length; m++) {
                const littArray: Array<Position> = []
                const x0 = (geo[i][m][0].x + transX) * scale
                const y0 = (geo[i][m][0].y + transY) * scale
                waterCtx.beginPath()
                waterCtx.moveTo(x0, y0)
                littArray.push({ x: x0, y: y0 })

                for (let n = 1; n < geo[i][m].length; n++) {
                  const x = (geo[i][m][n].x + transX) * scale
                  const y = (geo[i][m][n].y + transY) * scale
                  waterCtx.lineTo(x, y)
                  littArray.push({ x, y })
                }
                waterCtx.closePath()
                waterCtx.fillStyle = (m === 0) ? '#000000' : '#FFFFFF'
                waterCtx.fill()

                // draw littoral
                for (let j = 0; j < littArray.length - 1; j++) {
                  gradientLineTo(littArray[j], littArray[j + 1], lineWidth)
                }
              }
            }
            littCtx.drawImage(
              tmpLittCanvas.value!,
              transX * scale, transY * scale, 4096 * scale, 4096 * scale,
              transX * scale, transY * scale, 4096 * scale, 4096 * scale,
            )
          }

          if (tile.layers.waterway) {
            const geo = tile.layers.waterway.feature(0).loadGeometry()
            waterwayCtx.beginPath()

            for (let m = 0; m < geo.length; m++) {
              const x0 = (geo[m][0].x + transX) * scale
              const y0 = (geo[m][0].y + transY) * scale
              waterwayCtx.moveTo(x0, y0)

              for (let n = 1; n < geo[m].length; n++) {
                const x = (geo[m][n].x + transX) * scale
                const y = (geo[m][n].y + transY) * scale
                waterwayCtx.lineTo(x, y)
              }
            }
            waterwayCtx.stroke()
          }
        }
      }
    })
    await Promise.all(tilePromises)
  }


  function gradientLineTo(from: Position, to: Position, width: number) {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const lineLength = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx)

    const centerX = dx / 2 + from.x
    const centerY = dy / 2 + from.y

    const rectX = centerX - lineLength / 2
    const rectY = centerY - width / 2

    tmpLittCtx.save()
    tmpLittCtx.translate(centerX, centerY)
    tmpLittCtx.rotate(angle)
    tmpLittCtx.translate(-centerX, -centerY)

    const littGradient = tmpLittCtx.createLinearGradient(
      rectX,
      rectY,
      rectX,
      rectY + width,
    )

    littGradient.addColorStop(0, '#000000')
    for (let i = 1; i < 10; i++) {
      littGradient.addColorStop(i / 20, getColorFromValue(mapbox.value.settings.littArray[i - 1]))
    }
    littGradient.addColorStop(0.5, '#FFFFFF')
    for (let i = 11; i < 20; i++) {
      littGradient.addColorStop(i / 20, getColorFromValue(mapbox.value.settings.littArray[19 - i]))
    }
    littGradient.addColorStop(1, '#000000')

    tmpLittCtx.fillStyle = littGradient
    tmpLittCtx.fillRect(rectX, rectY, lineLength, width)

    tmpLittCtx.restore()

    const cornerGradient = tmpLittCtx.createRadialGradient(to.x, to.y, 0, to.x, to.y, width / 2)
    cornerGradient.addColorStop(0, '#FFFFFF')
    for (let i = 1; i < 10; i++) {
      cornerGradient.addColorStop(i / 10, getColorFromValue(mapbox.value.settings.littArray[9 - i]))
    }
    cornerGradient.addColorStop(1, '#000000')

    tmpLittCtx.beginPath()
    tmpLittCtx.arc(to.x, to.y, width / 2, 0, 2 * Math.PI, true)
    tmpLittCtx.fillStyle = cornerGradient
    tmpLittCtx.fill()
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


  function clearCanvas(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.canvas.width = 0
    ctx.canvas.height = 0
    ctx.canvas.remove()
  }


  // result canvas -----------------------------------------------------------------------------------

  const resultWater = ref<HTMLCanvasElement>()
  resultWater.value = document.createElement('canvas')
  resultWater.value.width = resultPixels
  resultWater.value.height = resultPixels

  const resultWaterCtx = waterCanvas.value!.getContext('2d', { storage: 'discardable', willReadFrequently: true }) as CanvasRenderingContext2D
  resultWaterCtx.globalCompositeOperation = 'source-over'

  const resultWaterway = ref<HTMLCanvasElement>()
  resultWaterway.value = document.createElement('canvas')
  resultWaterway.value.width = resultPixels
  resultWaterway.value.height = resultPixels

  const resultWaterwayCtx = waterwayCanvas.value!.getContext('2d', { storage: 'discardable', willReadFrequently: true }) as CanvasRenderingContext2D
  resultWaterwayCtx.globalCompositeOperation = 'source-over'


  // transpose & rotate ------------------------------------------------------------------------------

  const halfSize = (resultPixels - fasesOffset) / 2                         // cs1: 542px  cs2: 2050px

  resultWaterCtx.translate(halfSize, halfSize)
  resultWaterCtx.rotate(-mapbox.value.settings.angle * (Math.PI / 180))

  resultWaterCtx.drawImage(waterCanvas.value, -waterCanvas.value.width / 2, -waterCanvas.value.height / 2)

  waterwayCtx.translate(halfSize, halfSize)
  waterwayCtx.rotate(-mapbox.value.settings.angle * (Math.PI / 180))

  resultWaterwayCtx.drawImage(waterwayCanvas.value, -waterwayCanvas.value.width / 2, -waterwayCanvas.value.height / 2)

  // in CS2, add gaussian filter, on heightmap


  // decode data -------------------------------------------------------------------------------------

  const waterPixelData = resultWaterCtx.getImageData(0, 0, resultPixels, resultPixels).data
  const waterwayPixelData = resultWaterwayCtx.getImageData(0, 0, resultPixels, resultPixels).data

  const waterMap = decodeData(waterPixelData)
  const waterwayMap = decodeData(waterwayPixelData)

  clearCanvas(littCtx)
  clearCanvas(tmpLittCtx)
  clearCanvas(waterCtx)
  clearCanvas(waterwayCtx)
  clearCanvas(resultWaterCtx)
  clearCanvas(resultWaterwayCtx)

  return { waterMap, waterwayMap }
}
