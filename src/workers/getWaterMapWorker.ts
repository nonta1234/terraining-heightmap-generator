import { FetchError } from 'ofetch'
import * as PIXI from 'pixi.js'
import 'pixi.js/advanced-blend-modes'
import { VectorTile, Point } from 'mapbox-vector-tile'
import * as StackBlur from 'stackblur-canvas'
import { RingRope } from '~/utils/ringRope'
import type { GenerateMapOption } from '~/types/types'

type T = {
  data: Blob | undefined;
  error: FetchError<any> | undefined;
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

const destroyChild = (container: PIXI.Container | null) => {
  if (container) {
    container.children.forEach((child) => {
      child.destroy({ children: true, texture: true })
    })
  }
}

function createMask(pixelsPerTile: number) {
  const tileMask = new PIXI.Graphics()
  tileMask
    .rect(-3, -3, pixelsPerTile + 6, pixelsPerTile + 6)
    .fill(0xFFFFFF)
  return tileMask
}


class GetWaterMapWorker {
  private worker: Worker
  private app: PIXI.Application
  private waterCtx: OffscreenCanvasRenderingContext2D | undefined
  private littCtx: OffscreenCanvasRenderingContext2D | undefined
  private cornerCtx: OffscreenCanvasRenderingContext2D | undefined

  constructor() {
    this.worker = self as any
    PIXI.DOMAdapter.set(PIXI.WebWorkerAdapter)
    this.app = new PIXI.Application<PIXI.WebGLRenderer<HTMLCanvasElement>>()
    self.onmessage = this.handleMessage.bind(this)
  }

  async handleMessage(e: MessageEvent<any>) {
    const message = e.data
    if (message.type === 'initialize') {
      this.waterCtx = message.canvases[0].getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D
      this.littCtx = message.canvases[1].getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D
      this.cornerCtx = message.canvases[2].getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D
      await this.app.init({
        antialias: true,
        useBackBuffer: true,
        preserveDrawingBuffer: true,
        preference: 'webgl',
      })
    } else if (message.type === 'get') {
      const {
        mapType,
        settings,
        token,
      } = message.body as GenerateMapOption
      this.littCtx?.clearRect(0, 0, this.littCtx.lineWidth, this.littCtx.canvas.height)
      this.cornerCtx?.clearRect(0, 0, this.cornerCtx.lineWidth, this.cornerCtx.canvas.height)
      const isDebug = message.isDebug
      const pixelsPerTile = 4096
      const extentOffset = mapType === 'cs2play' ? 0.375 : 0
      const { x0, y0, x1, y1 } = getExtentInWorldCood(settings.lng, settings.lat, settings.size * 1.5, extentOffset, pixelsPerTile)
      const side = x1 - x0
      const tmpMapPixels = mapSpec[mapType].mapFaces * 1.5
      const zoom = Math.ceil(Math.log2(tmpMapPixels / side)) + 1
      const scale = tmpMapPixels / (side * (2 ** zoom))
      const tileX0 = Math.floor(x0 * (2 ** zoom) / pixelsPerTile)
      const tileY0 = Math.floor(y0 * (2 ** zoom) / pixelsPerTile)
      const tileX1 = Math.floor(x1 * (2 ** zoom) / pixelsPerTile)
      const tileY1 = Math.floor(y1 * (2 ** zoom) / pixelsPerTile)
      const tileCount = Math.max(tileX1 - tileX0 + 1, tileY1 - tileY0 + 1)
      const offsetX =  x0 * (2 ** zoom) - tileX0 * pixelsPerTile
      const offsetY = y0 * (2 ** zoom) - tileY0 * pixelsPerTile
      const resultPixels = mapSpec[mapType].mapPixels + 4

      // PIXI setup
      destroyChild(this.app.stage)
      this.app.renderer.resize(tmpMapPixels, tmpMapPixels)
      const slopeTexture = createSlopeTexture(mapType, settings, scale, this.littCtx!)
      const cornerTexture = createRadialTexture(mapType, settings, scale, this.cornerCtx!)

      const tiles = new Array<Promise<T>>(tileCount * tileCount)

      // fetch tiles
      for (let i = 0; i < tileCount; i++) {
        for (let j = 0; j < tileCount; j++) {
          tiles[j + i * tileCount] = useFetchVectorTiles(zoom, tileX0 + j, tileY0 + i, token)
        }
      }

      const tileList = await Promise.allSettled(tiles)

      const halfSize = tmpMapPixels / 2

      const masterContainer = new PIXI.Container()
      masterContainer.x = halfSize
      masterContainer.y = halfSize
      masterContainer.pivot.x = halfSize
      masterContainer.pivot.y = halfSize
      masterContainer.angle = -settings.angle

      this.app.stage.addChild(masterContainer)

      const waterAreaContainer = new PIXI.Container()
      const waterlittContainer = new PIXI.Container()
      const waterWayMapContainer = new PIXI.Container()

      const { waterContainer, littoralContainer, waterWayContainer } = await processTiles(tileList)

      waterAreaContainer.addChild(waterContainer)
      waterlittContainer.addChild(littoralContainer)
      waterWayMapContainer.addChild(waterWayContainer)

      const halfMapSize = (mapSpec[mapType].mapFaces + 4) / 2

      // get water data
      const bg1 = new PIXI.Graphics()
        .rect(-10, -10, tmpMapPixels + 20, tmpMapPixels + 20)
        .fill(0xFFFFFF)
      masterContainer.addChild(bg1)
      masterContainer.addChild(waterAreaContainer)
      masterContainer.addChild(waterlittContainer)
      const waterRT = PIXI.RenderTexture.create({
        width: this.app.stage.width,
        height: this.app.stage.height,
        resolution: 1,
        antialias: true,
      })
      this.app.renderer.render({ target: waterRT, container: this.app.stage })
      const waterCanvas = this.app.renderer.extract.canvas(this.app.stage)

      let stageRect = this.app.stage.getBounds().rectangle

      const waterCtx = waterCanvas.getContext('2d')
      const waterImgData = waterCtx!.getImageData(
        this.app.screen.width / 2 - halfMapSize - stageRect.x,
        this.app.screen.height / 2 - halfMapSize - stageRect.y,
        resultPixels,
        resultPixels,
      )
      const waterImgArray = waterImgData.data

      destroyChild(masterContainer)

      // get water way data
      const bg2 = new PIXI.Graphics()
        .rect(-10, -10, tmpMapPixels + 20, tmpMapPixels + 20)
        .fill(0xFFFFFF)
      masterContainer.addChild(bg2)
      masterContainer.addChild(waterWayMapContainer)
      const waterWayRT = PIXI.RenderTexture.create({
        width: this.app.stage.width,
        height: this.app.stage.height,
        resolution: 1,
        antialias: true,
      })
      this.app.renderer.render({ target: waterWayRT, container: this.app.stage })
      const waterWayCanvas = this.app.renderer.extract.canvas(this.app.stage)

      stageRect = this.app.stage.getBounds().rectangle

      const waterWayCtx = waterWayCanvas.getContext('2d')
      const waterWayImgData = waterWayCtx!.getImageData(
        this.app.screen.width / 2 - halfMapSize - stageRect.x,
        this.app.screen.height / 2 - halfMapSize - stageRect.y,
        resultPixels,
        resultPixels,
      )

      const waterWayImgArray = mapType === 'cs2play'
        ? StackBlur.imageDataRGB(waterWayImgData, 0, 0, resultPixels, resultPixels, 2).data
        : waterWayImgData.data

      destroyChild(this.app.stage)

      const waterMap = decodeData(waterImgArray)
      const waterwayMap = decodeData(waterWayImgArray)

      if (isDebug) {
        const debugWaterImg = new PIXI.Sprite(waterRT)
        const debugWaterWayImg = new PIXI.Sprite(waterWayRT)
        debugWaterWayImg.blendMode = 'darken'
        this.app.stage.addChild(debugWaterImg, debugWaterWayImg)
        this.waterCtx!.canvas.width = resultPixels
        this.waterCtx!.canvas.height = resultPixels
        this.waterCtx?.putImageData(waterImgData, 0, 0)
      }

      async function processTiles(list: PromiseSettledResult<T>[]) {
        const waterContainer = new PIXI.Container()
        const littoralContainer = new PIXI.Container()
        const waterWayContainer = new PIXI.Container()

        const tilePromises = list.map(async (tileResult, index) => {
          if (tileResult.status === 'fulfilled') {
            const arrayBuffer = await tileResult.value.data!.arrayBuffer()
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

              littMaskWrapper.blendMode = 'lighten'

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
                    .poly(outerPath)
                    .fill(0x000000)

                  for (let m = 1; m < geo[i].length; m++) {
                    const innerPath = geo[i][m]
                    waterAreaGraphics
                      .poly(innerPath)
                      .fill(0xFFFFFF)
                  }
                }
                waterMaskWrapper.addChild(waterAreaGraphics)

                for (let i = 0; i < geo.length; i++) {
                  for (let m = 0; m < geo[i].length; m++) {
                    const path = []
                    for (let k = 0; k < geo[i][m].length; k++) {
                      path.push(new PIXI.Point(geo[i][m][k].x, geo[i][m][k].y))
                      const corner = new PIXI.Sprite({ texture: cornerTexture, blendMode: 'lighten' })
                      corner.scale.set(0.5)
                      corner.anchor.set(0.5)
                      corner.position.set(geo[i][m][k].x, geo[i][m][k].y)
                      // littMaskWrapper.addChild(corner)
                    }
                    const littRope = new RingRope({ texture: slopeTexture, points: path })
                    littRope.blendMode = 'lighten'
                    littMaskWrapper.addChild(littRope)
                  }
                }
              }

              if (tile.layers.waterway) {
                const geo = tile.layers.waterway.feature(0).loadGeometry()
                const lineWidth = mapType === 'cs2play' ? 2 / scale : 1 / scale

                const waterline = new PIXI.Graphics()
                waterline.setStrokeStyle({ width: lineWidth, color: 0x000000 })

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
  }
}

export default new GetWaterMapWorker()
