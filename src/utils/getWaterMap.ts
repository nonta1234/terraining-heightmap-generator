import { FetchError } from 'ofetch'
import { VectorTile, Point } from 'mapbox-vector-tile'

type T = {
  data: globalThis.Ref<Blob | null>;
  error: globalThis.Ref<FetchError<any> | null>;
}

type Position = {
  x: number;
  y: number;
}


export const getWaterMap = async () => {
  const mapbox = useMapbox()
  const resultPixels = mapSpec[mapbox.value.settings.gridInfo].mapPixels + 4  // 1085px (cs1)
  const tmpMapPixels = Math.ceil((resultPixels + 1) * Math.SQRT2)             // 1086√2px (cs1)
  const mapFases = mapSpec[mapbox.value.settings.gridInfo].mapPixels - 1      // 1080px (cs1)
  const waterAreaSize = mapbox.value.settings.size / mapFases * tmpMapPixels
  const pixelsPerTile = 4096  // number of pixels in vector-tiles

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

  const zoom = calculateZoomLevel(referenceLat, waterAreaSize, tmpMapPixels, pixelsPerTile) + 1

  const x = lng2tile(topleft[0], zoom)
  const y = lat2tile(topleft[1], zoom)
  const x2 = lng2tile(bottomright[0], zoom)
  const y2 = lat2tile(bottomright[1], zoom)
  const tileCount = Math.max(x2 - x + 1, y2 - y + 1)

  const posX0 = lng2pixel(topleft[0], zoom, pixelsPerTile)
  const posY0 = lat2pixel(topleft[1], zoom, pixelsPerTile)
  const posX1 = lng2pixel(bottomright[0], zoom, pixelsPerTile)
  const posY1 = lat2pixel(bottomright[1], zoom, pixelsPerTile)

  const mapWidth = posX1 - posX0
  const mapHeight = posY1 - posY0

  const tilePosX = x * pixelsPerTile
  const tilePosY = y * pixelsPerTile

  const offsetX = posX0 - tilePosX
  const offsetY = posY0 - tilePosY

  const mapPixelsOnTile = Math.sqrt(mapWidth * mapWidth + mapHeight * mapHeight) / Math.SQRT2
  const scale = tmpMapPixels / mapPixelsOnTile

  const tiles = new Array<Promise<T>>(Math.pow(tileCount, 2))


  // waterCanvas setting -----------------------------------------------------------------------------

  const waterCanvas = ref<HTMLCanvasElement>()
  waterCanvas.value = document.createElement('canvas')
  waterCanvas.value.width = tmpMapPixels
  waterCanvas.value.height = tmpMapPixels

  const waterCtx = waterCanvas.value!.getContext('2d', { storage: 'discardable', willReadFrequently: true }) as CanvasRenderingContext2D
  waterCtx.globalCompositeOperation = 'source-over'
  waterCtx.fillStyle = '#FFFFFF'
  waterCtx.fillRect(0, 0, waterCanvas.value.width, waterCanvas.value.height)


  // littCanvas setting ------------------------------------------------------------------------------

  const littCanvas = ref<HTMLCanvasElement>()
  littCanvas.value = document.createElement('canvas')
  littCanvas.value.width = tmpMapPixels
  littCanvas.value.height = tmpMapPixels

  const littCtx = littCanvas.value!.getContext('2d', { storage: 'discardable', willReadFrequently: true }) as CanvasRenderingContext2D
  littCtx.fillStyle = '#000000'
  littCtx.fillRect(0, 0, littCanvas.value.width, littCanvas.value.height)
  littCtx.globalCompositeOperation = 'lighten'


  // tmplittCanvas setting ---------------------------------------------------------------------------

  const tmpLittCanvas = ref<HTMLCanvasElement>()
  tmpLittCanvas.value = document.createElement('canvas')
  tmpLittCanvas.value.width = tmpMapPixels
  tmpLittCanvas.value.height = tmpMapPixels

  const tmpLittCtx = tmpLittCanvas.value!.getContext('2d', { storage: 'discardable', willReadFrequently: true }) as CanvasRenderingContext2D
  tmpLittCtx.globalCompositeOperation = 'lighten'


  // waterwayCanvas setting --------------------------------------------------------------------------

  const waterwayCanvas = ref<HTMLCanvasElement>()
  waterwayCanvas.value = document.createElement('canvas')
  waterwayCanvas.value.width = tmpMapPixels
  waterwayCanvas.value.height = tmpMapPixels

  const waterwayCtx = waterwayCanvas.value!.getContext('2d', { storage: 'discardable', willReadFrequently: true }) as CanvasRenderingContext2D
  waterwayCtx.fillStyle = '#FFFFFF'
  waterwayCtx.fillRect(0, 0, waterwayCanvas.value.width, waterwayCanvas.value.height)
  waterwayCtx.strokeStyle = '#000000'
  waterwayCtx.lineWidth = 0.7


  // fetch tiles & draw ------------------------------------------------------------------------------

  for (let i = 0; i < tileCount; i++) {
    for (let j = 0; j < tileCount; j++) {
      tiles[j + i * tileCount] = useFetchVectorTiles(zoom, x + j, y + i)
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
                  gradientLineTo(littArray[j], littArray[j + 1])
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


  function gradientLineTo(from: Position, to: Position) {
    const lineWidth = mapbox.value.settings.littoral / 8
    const dx = to.x - from.x
    const dy = to.y - from.y
    const lineLength = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx)

    const centerX = dx / 2 + from.x
    const centerY = dy / 2 + from.y

    const rectX = centerX - lineLength / 2
    const rectY = centerY - lineWidth / 2

    tmpLittCtx.save()
    tmpLittCtx.translate(centerX, centerY)
    tmpLittCtx.rotate(angle)
    tmpLittCtx.translate(-centerX, -centerY)

    const littGradient = tmpLittCtx.createLinearGradient(
      rectX,
      rectY,
      rectX,
      rectY + lineWidth,
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
    tmpLittCtx.fillRect(rectX, rectY, lineLength, lineWidth)

    tmpLittCtx.restore()

    const cornerGradient = tmpLittCtx.createRadialGradient(to.x, to.y, 0, to.x, to.y, lineWidth / 2)
    cornerGradient.addColorStop(0, '#FFFFFF')
    for (let i = 1; i < 10; i++) {
      cornerGradient.addColorStop(i / 10, getColorFromValue(mapbox.value.settings.littArray[9 - i]))
    }
    cornerGradient.addColorStop(1, '#000000')

    tmpLittCtx.beginPath()
    tmpLittCtx.arc(to.x, to.y, lineWidth / 2, 0, 2 * Math.PI, true)
    tmpLittCtx.fillStyle = cornerGradient
    tmpLittCtx.fill()
  }


  function decodeData(arr: Uint8ClampedArray) {
    const elevs = new Array<number>(arr.length / 4)
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

  const halfSize = (resultPixels - 1) / 2

  resultWaterCtx.translate(halfSize, halfSize)
  resultWaterCtx.rotate(-mapbox.value.settings.angle * (Math.PI / 180))

  resultWaterCtx.drawImage(waterCanvas.value, -waterCanvas.value.width / 2, -waterCanvas.value.height / 2)

  waterwayCtx.translate(halfSize, halfSize)
  waterwayCtx.rotate(-mapbox.value.settings.angle * (Math.PI / 180))

  resultWaterwayCtx.drawImage(waterwayCanvas.value, -waterwayCanvas.value.width / 2, -waterwayCanvas.value.height / 2)


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
