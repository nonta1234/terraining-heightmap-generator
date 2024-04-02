import { FetchError } from 'ofetch'
import * as PIXI from 'pixi.js-legacy'
import '@pixi/math-extras'
import { VectorTile, Point } from 'mapbox-vector-tile'
import * as StackBlur from 'stackblur-canvas'
import { RingRope } from '~/utils/ringRope'
import type { Mapbox, MapType } from '~/types/types'


type T = {
  data: globalThis.Ref<Blob | null>;
  error: globalThis.Ref<FetchError<any> | null>;
}


const destroyChild = (container: PIXI.Container | null) => {
  if (container) {
    container.children.forEach((child) => {
      if (child instanceof PIXI.Container) {
        child.destroy({ children: true, texture: true })
      } else {
        child.destroy()
      }
    })
  }
}


function catmull(t: number, p0: number, p1: number, p2: number, p3: number) {
  return 0.5 * ((2 * p1) + (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * (t ** 2) +
    (-p0 + 3 * p1 - 3 * p2 + p3) * (t ** 3))
}

function getStartPos(stop: number) {
  return Math.round(stop) + 0.5
}

function getEndPos(stop: number) {
  return Math.round(stop) - 0.5
}


const createSlopeTexture = (mapbox: Ref<Mapbox>, mapType: MapType, scale: number) => {
  let unit = 16
  if (mapType === 'cs2') {
    unit = 14
  } else if (mapType === 'cs2play') {
    unit = 3.5
  }
  const size = Math.max(mapbox.value.settings.littoral / unit / scale * 2, 2)
  const pixels = Math.ceil(size)

  // const slopeCanvas = ref<HTMLCanvasElement>()
  const slopeCanvas = document.getElementById('litt-canvas') as HTMLCanvasElement
  slopeCanvas.width = 1
  slopeCanvas.height = pixels * 2
  const ctx = slopeCanvas!.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
  ctx.fillStyle = 'rgba(0, 0, 0, 1.0)'
  ctx.fillRect(0, 0, slopeCanvas.width, slopeCanvas.height)

  const stopPosition: number[] = []
  const offset = pixels - size
  const amount = size / 10

  stopPosition.push(offset - amount)
  stopPosition.push(offset)

  for (let i = 0; i < mapbox.value.settings.littArray.length; i++) {
    stopPosition.push((i + 1) * amount + offset)
  }

  stopPosition.push(pixels)
  stopPosition.push(pixels + amount)

  const stopValue = [
    mapbox.value.settings.littArray[0],
    0,
    ...mapbox.value.settings.littArray,
    1,
    mapbox.value.settings.littArray[mapbox.value.settings.littArray.length - 1],
  ]

  for (let i = 1; i < stopPosition.length - 2; i++) {
    const startPos = getStartPos(stopPosition[i])
    const endPos = getEndPos(stopPosition[i + 1])
    const range = stopPosition[i + 1] - stopPosition[i]

    for (let j = startPos; j <= endPos; j += 1) {
      const t = (j - stopPosition[i]) / range
      const value = catmull(t, stopValue[i - 1], stopValue[i], stopValue[i + 1], stopValue[i + 2]) * 255
      const colorValue = Math.round(Math.max(Math.min(value, 255), 0))
      ctx.fillStyle = `rgba(${colorValue}, ${colorValue}, ${colorValue}, 1.0)`
      ctx.fillRect(0, Math.floor(j), 1, 1)
      ctx.fillRect(0, slopeCanvas.height - Math.floor(j) - 1, 1, 1)
    }
  }

  return PIXI.Texture.from(slopeCanvas)
}


const createRadialTexture = (mapbox: Ref<Mapbox>, mapType: MapType, scale: number) => {
  let unit = 16
  if (mapType === 'cs2') {
    unit = 14
  } else if (mapType === 'cs2play') {
    unit = 3.5
  }
  const size = Math.max(mapbox.value.settings.littoral / unit / scale * 2, 2)
  const pixels = Math.ceil(size)

  // const radialCanvas = ref<HTMLCanvasElement>()
  const radialCanvas = document.createElement('canvas') as HTMLCanvasElement
  radialCanvas.width = pixels * 2
  radialCanvas.height = pixels * 2
  const ctx = radialCanvas!.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D

  ctx.fillStyle = 'rgba(0, 0, 0, 1.0)'
  ctx.fillRect(0, 0, radialCanvas.width, radialCanvas.height)

  const stopPosition: number[] = []
  const offset = pixels - size
  const amount = size / 10

  stopPosition.push(offset - amount)
  stopPosition.push(offset)

  for (let i = 0; i < mapbox.value.settings.littArray.length; i++) {
    stopPosition.push((i + 1) * amount + offset)
  }

  stopPosition.push(pixels)
  stopPosition.push(pixels + amount)

  const stopValue = [
    mapbox.value.settings.littArray[0],
    0,
    ...mapbox.value.settings.littArray,
    1,
    mapbox.value.settings.littArray[mapbox.value.settings.littArray.length - 1],
  ]

  for (let i = 1; i < stopPosition.length - 2; i++) {
    const startPos = getStartPos(stopPosition[i])
    const endPos = getEndPos(stopPosition[i + 1])
    const range = stopPosition[i + 1] - stopPosition[i]

    for (let j = startPos; j <= endPos; j += 1) {
      const t = (j - stopPosition[i]) / range
      const value = catmull(t, stopValue[i - 1], stopValue[i], stopValue[i + 1], stopValue[i + 2]) * 255
      const colorValue = Math.round(Math.max(Math.min(value, 255), 0))

      ctx.fillStyle = `rgba(${colorValue}, ${colorValue}, ${colorValue}, 1.0)`
      ctx.beginPath()
      ctx.arc(pixels, pixels, pixels - Math.floor(j), 0, 2 * Math.PI)
      ctx.fill()
    }
  }

  return PIXI.Texture.from(radialCanvas)
}


function createMask(pixelsPerTile: number) {
  const tileMask = new PIXI.Graphics()
  tileMask
    .beginFill(0xFFFFFF)
    .drawRect(-3, -3, pixelsPerTile + 6, pixelsPerTile + 6)
    .endFill()
  return tileMask
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


export const getWaterMap = async (mapType: MapType = 'cs1') => {
  const mapbox = useMapbox()
  const factor = mapType === 'cs2play' ? 4 : 1
  let resultPixels = mapSpec[mapType].mapPixels + (4 * factor)                // cs1: 1085px             cs2: 4100px    cs2play: 16400px -> 4100px
  let tmpMapPixels = Math.ceil((resultPixels + factor) * Math.SQRT2)          // cs1: 1086√2px (1536px)  cs2: 4101√2px  cs2play: 16404√2px -> 4101√2px (5800px)
  const fasesOffset = mapType === 'cs1' ? 1 : 0
  const mapFases = mapSpec[mapType].mapPixels - fasesOffset                   // cs1: 1080px             cs2: 4096px    cs2play: 16384px
  const waterAreaSize = mapbox.value.settings.size / mapFases * tmpMapPixels
  const pixelsPerTile = 4096                                                  // number of pixels in vector-tiles
  if (mapType === 'cs2play') {
    resultPixels = resultPixels / 4                                           // cs2play: 16400px -> 4100px
  }

  const { topleft, bottomright } = getExtent(
    mapbox.value.settings.lng,
    mapbox.value.settings.lat,
    waterAreaSize,
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

    tmpMapPixels = Math.ceil((resultPixels + 1) * Math.SQRT2)
    tileCount = Math.max(playTileX1 - tileX0 + 1, playTileY1 - tileY0 + 1)
  }

  const tilePosX = tileX0 * pixelsPerTile
  const tilePosY = tileY0 * pixelsPerTile

  const offsetX = (mapType === 'cs2play' ? playAreaX0 : posX0) - tilePosX
  const offsetY = (mapType === 'cs2play' ? playAreaY0 : posY0) - tilePosY

  const tiles = new Array<Promise<T>>(Math.pow(tileCount, 2))

  console.log('watermap:', zoom, tileX0, tileY0, tileCount, tmpMapPixels, scale, offsetX, offsetY)

  // pixi setup
  const app = useState<PIXI.Application>('pixi-app')
  destroyChild(app.value.stage)
  app.value.stage.removeChildren()
  PIXI.utils.clearTextureCache()
  app.value.renderer.resize(tmpMapPixels, tmpMapPixels)

  // slope texture setup
  PIXI.Texture.addToCache(createSlopeTexture(mapbox, mapType, scale), 'slope')
  PIXI.Texture.addToCache(createRadialTexture(mapbox, mapType, scale), 'corner')

  // fetch tiles & draw ------------------------------------------------------------------------------

  for (let i = 0; i < tileCount; i++) {
    for (let j = 0; j < tileCount; j++) {
      tiles[j + i * tileCount] = useFetchVectorTiles(zoom, tileX0 + j, tileY0 + i)
    }
  }

  const tileList = await Promise.allSettled(tiles)

  const halfSize = tmpMapPixels / 2

  const masterContainer = new PIXI.Container()
  masterContainer.x = halfSize
  masterContainer.y = halfSize
  masterContainer.pivot.x = halfSize
  masterContainer.pivot.y = halfSize
  masterContainer.angle = -mapbox.value.settings.angle

  app.value.stage.addChild(masterContainer)

  const waterAreaContainer = new PIXI.Container()
  const waterlittContainer = new PIXI.Container()
  const waterWayMapContainer = new PIXI.Container()

  const { waterContainer, littoralContainer, waterWayContainer } = await processTiles(tileList)

  waterAreaContainer.addChild(waterContainer)
  waterlittContainer.addChild(littoralContainer)
  waterWayMapContainer.addChild(waterWayContainer)

  const halfMapSize = (resultPixels - fasesOffset) / 2

  // get water data
  const bg1 = new PIXI.Graphics()
    .beginFill(0xFFFFFF)
    .drawRect(-10, -10, tmpMapPixels + 20, tmpMapPixels + 20)
    .endFill()
  masterContainer.addChild(bg1)
  masterContainer.addChild(waterAreaContainer)
  masterContainer.addChild(waterlittContainer)
  const waterRT = PIXI.RenderTexture.create({
    width: app.value.stage.width,
    height: app.value.stage.height,
    resolution: 1,
  })
  app.value.renderer.render(app.value.stage, { renderTexture: waterRT })
  const waterCanvas = app.value.renderer.extract.canvas(app.value.stage)

  let stageRect = app.value.stage.getBounds()

  const waterCtx = waterCanvas.getContext('2d')
  const waterImgData = waterCtx!.getImageData(
    app.value.screen.width / 2 - halfMapSize - stageRect.x,
    app.value.screen.height / 2 - halfMapSize - stageRect.y,
    resultPixels,
    resultPixels,
  ).data

  destroyChild(masterContainer)

  // get water way data
  const bg2 = new PIXI.Graphics()
    .beginFill(0xFFFFFF)
    .drawRect(-10, -10, tmpMapPixels + 20, tmpMapPixels + 20)
    .endFill()
  masterContainer.addChild(bg2)
  masterContainer.addChild(waterWayMapContainer)
  const waterWayRT = PIXI.RenderTexture.create({
    width: app.value.stage.width,
    height: app.value.stage.height,
    resolution: 1,
  })
  app.value.renderer.render(app.value.stage, { renderTexture: waterWayRT })
  const waterWayCanvas = app.value.renderer.extract.canvas(app.value.stage)

  stageRect = app.value.stage.getBounds()

  const waterWayCtx = waterWayCanvas.getContext('2d')
  const waterWayImgData = waterWayCtx!.getImageData(
    app.value.screen.width / 2 - halfMapSize - stageRect.x,
    app.value.screen.height / 2 - halfMapSize - stageRect.y,
    resultPixels,
    resultPixels,
  )

  const resultWwImgData = mapType === 'cs2play'
    ? StackBlur.imageDataRGB(waterWayImgData, 0, 0, resultPixels, resultPixels, 2).data
    : waterWayImgData.data

  destroyChild(app.value.stage)
  PIXI.utils.clearTextureCache()

  const waterMap = decodeData(waterImgData)
  const waterwayMap = decodeData(resultWwImgData)

  if (useDebug()) {
    const debugWaterImg = new PIXI.Sprite(waterRT)
    const debugWaterWayImg = new PIXI.Sprite(waterWayRT)
    debugWaterWayImg.blendMode = PIXI.BLEND_MODES.DARKEN
    app.value.stage.addChild(debugWaterImg, debugWaterWayImg)
  }

  // functions ---------------------------------------------------------------------------------------

  async function processTiles(list: PromiseSettledResult<T>[]) {
    const waterContainer = new PIXI.Container()
    const littoralContainer = new PIXI.Container()
    const waterWayContainer = new PIXI.Container()

    const tilePromises = list.map(async (tileResult, index) => {
      if (tileResult.status === 'fulfilled') {
        const arrayBuffer = await tileResult.value.data.value?.arrayBuffer()
        if (arrayBuffer) {
          // tile scale & position
          const tile = new VectorTile(new Uint8Array(arrayBuffer))
          const transX = (Math.floor(index % tileCount) * pixelsPerTile - offsetX) * scale
          const transY = (Math.floor(index / tileCount) * pixelsPerTile - offsetY) * scale

          // set tile container
          const tileWaterContainer = new PIXI.Container()
          tileWaterContainer.scale.set(scale)
          tileWaterContainer.position.set(transX, transY)

          const tileLittoralContainer = new PIXI.Container()
          tileLittoralContainer.scale.set(scale)
          tileLittoralContainer.position.set(transX, transY)

          const tileWaterWayContainer = new PIXI.Container()
          tileWaterWayContainer.scale.set(scale)
          tileWaterWayContainer.position.set(transX, transY)

          // set tile mask
          const waterMaskWrapper = new PIXI.Container()
          const littMaskWrapper = new PIXI.Container()
          const waterWayMaskWrapper = new PIXI.Container()

          waterMaskWrapper.mask = createMask(pixelsPerTile)
          littMaskWrapper.mask = createMask(pixelsPerTile)
          waterWayMaskWrapper.mask = createMask(pixelsPerTile)

          // draw start
          if (tile.layers.water) {
            const geo = tile.layers.water.feature(0).asPolygons() as Point[][][]
            const waterAreaGraphics = new PIXI.Graphics()

            // draw water area & inner lands
            for (let i = 0; i < geo.length; i++) {
              const outerPath = geo[i][0]
              waterAreaGraphics
                .beginFill(0x000000)
                .drawPolygon(outerPath)
                .endFill()

              for (let m = 1; m < geo[i].length; m++) {
                const innerPath = geo[i][m]
                waterAreaGraphics
                  .beginFill(0xFFFFFF)
                  .drawPolygon(innerPath)
                  .endFill()
              }
            }
            waterMaskWrapper.addChild(waterAreaGraphics)

            for (let i = 0; i < geo.length; i++) {
              for (let m = 0; m < geo[i].length; m++) {
                const path = []
                for (let k = 0; k < geo[i][m].length; k++) {
                  path.push(new PIXI.Point(geo[i][m][k].x, geo[i][m][k].y))
                  const corner = new PIXI.Sprite(PIXI.utils.TextureCache.corner)
                  corner.blendMode = PIXI.BLEND_MODES.LIGHTEN
                  corner.scale.set(0.5)
                  corner.anchor.set(0.5)
                  corner.position.set(geo[i][m][k].x, geo[i][m][k].y)
                  littMaskWrapper.addChild(corner)
                }
                const littRope = new RingRope(PIXI.utils.TextureCache.slope, path)
                littRope.canvasPadding = 5
                littRope.blendMode = PIXI.BLEND_MODES.LIGHTEN
                littMaskWrapper.addChild(littRope)
              }
            }
          }

          if (tile.layers.waterway) {
            const geo = tile.layers.waterway.feature(0).loadGeometry()
            const lineWidth = mapType === 'cs2play' ? 2 / scale : 1 / scale

            const waterline = new PIXI.Graphics()
            waterline.lineStyle(lineWidth, 0x000000)

            for (let m = 0; m < geo.length; m++) {
              waterline.moveTo(geo[m][0].x, geo[m][0].y)

              for (let n = 1; n < geo[m].length; n++) {
                waterline.lineTo(geo[m][n].x, geo[m][n].y)
              }
            }
            waterWayMaskWrapper.addChild(waterline)
          }

          tileWaterContainer.addChild(waterMaskWrapper, waterMaskWrapper.mask)
          tileLittoralContainer.addChild(littMaskWrapper, littMaskWrapper.mask)
          tileWaterWayContainer.addChild(waterWayMaskWrapper, waterWayMaskWrapper.mask)

          waterContainer.addChild(tileWaterContainer)
          littoralContainer.addChild(tileLittoralContainer)
          waterWayContainer.addChild(tileWaterWayContainer)
        }
      }
    })
    await Promise.all(tilePromises)

    return {
      waterContainer,
      littoralContainer,
      waterWayContainer,
    }
  }

  return { waterMap, waterwayMap }
}
