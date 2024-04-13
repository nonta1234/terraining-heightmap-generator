import * as PIXI from '~/types/pixijs-canvas-webworker'
import type { GenerateMapOption } from '~/types/types'
import { useFetchTerrainTiles } from '~/composables/useFetchTiles'

const ctx: Worker = self as any

ctx.onmessage = async (e) => {
  const {
    mapType,
    settings,
    scaleFactor,
    token,
  } = e.data.data as GenerateMapOption

  const tileCanvas: OffscreenCanvas = e.data.canvases[0]
  const waterCanvas: OffscreenCanvas = e.data.canvases[1]
  const littCanvas: OffscreenCanvas = e.data.canvases[2]
  const cornerCanvas: OffscreenCanvas = e.data.canvases[3]

  waterCanvas.height = 100
  waterCanvas.width = 100

  console.log(waterCanvas)

  /*
  const app = new PIXI.Application({
    antialias: true,
    view: waterCanvas,
    preserveDrawingBuffer: true,
    backgroundColor: 0x000000,
    forceCanvas: true,
  })
  console.log(app)
*/
  /**
  1. getHeightMap

  2. getWaterMap

  3. convert
  */














  const { data, error } = await useFetchTerrainTiles(0, 10, 0, token)
  if (error) {
    console.log(error)
  }

  /**
  const heightMapTime0 = window.performance.now()
  const tmpHeightMap = await getHeightMap(mapType)
  const heightMapTime = window.performance.now() - heightMapTime0
  console.log('heightmap:', heightMapTime.toFixed(1) + 'ms')

  const waterMapTime0 = window.performance.now()
  const { waterMap, waterwayMap } = await getWaterMap(mapType)
  const waterMapTime = window.performance.now() - waterMapTime0
  console.log('watermap:', waterMapTime.toFixed(1) + 'ms')
  */
}

export default ctx
