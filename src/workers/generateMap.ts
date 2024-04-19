import { Application, WebGLRenderer } from 'pixi.js'
import type { GenerateMapOption } from '~/types/types'

const ctx: Worker = self as any

ctx.onmessage = async (e) => {
  const {
    mapType,
    settings,
    token,
    scaleFactor,
  } = e.data.data as GenerateMapOption

  const tileCanvas: OffscreenCanvas = e.data.canvases[0]
  const waterCanvas: OffscreenCanvas = e.data.canvases[1]
  const littCanvas: OffscreenCanvas = e.data.canvases[2]
  const cornerCanvas: OffscreenCanvas = e.data.canvases[3]
  /*
  const app = new Application<WebGLRenderer<HTMLCanvasElement>>()
  await app.init({
    antialias: true,
    canvas: waterCanvas,
    preserveDrawingBuffer: true,
    background: 0x000000,
    preference: 'webgl',
  })
*/
  /**
  1. getHeightMap

  2. getWaterMap

  3. convert
  */

  console.log(app)

  const tmpHeightmap = await getHeightMap(settings, token, tileCanvas, mapType)
}

export default ctx
