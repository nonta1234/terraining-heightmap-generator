import type { Position } from 'geojson'
import { $fetch, type FetchError } from 'ofetch'
import { Canvg } from 'canvg'
import { DOMParser } from '@xmldom/xmldom'
import { ATTR, ATTR_RAS } from '~/utils/const'
import { pixel2lng, pixel2lat } from '~/utils/tiles'
import type { Settings } from '~/types/types'
import { getExtentInWorldCoords } from '~/utils/getExtent'
import logoUrl from '~/assets/svg/mapboxgl-ctrl-logo.svg'
import initPng, { encode_png } from '~~/png_lib/pkg'

type T = {
  settings: Settings;
  styleUrl: string;
  zoom: number;
  offset?: number;
  maxImageSize?: number,
  imageSize?: number;
}

type R = {
  data: Blob | undefined;
  error: FetchError<any> | undefined;
}

const clearCanvas = (ctx: OffscreenCanvasRenderingContext2D) => {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.canvas.width = 0
  ctx.canvas.height = 0
}

const rotate = (array: Position[], angle: number, centerX: number, centerY: number)  => {
  const cosTheta = Math.cos(-angle * Math.PI / 180)
  const sinTheta = Math.sin(-angle * Math.PI / 180)
  const result: Position[] = []

  for (let i = 0; i < array.length; i++) {
    const offsetX = array[i][0] - centerX
    const offsetY = array[i][1] - centerY
    const xPos = (offsetX * cosTheta + offsetY * sinTheta) + centerX
    const yPos = (offsetY * cosTheta - offsetX * sinTheta) + centerY
    result.push([xPos, yPos])
  }
  return result
}

const fetchImage = async (url: string) => {
  let data: Blob | undefined
  let error: FetchError | undefined
  try {
    data = await $fetch<Blob>(url)
  } catch (err) {
    error = err as FetchError
  }
  return { data, error }
}

class GetCustomMapImage {
  private worker: Worker

  constructor() {
    this.worker = self as any
    self.onmessage = (e) => {
      this.handleMessage(e).catch((error) => {
        self.postMessage({ type: 'error', message: error.message })
      })
    }
  }

  private async handleMessage(e: MessageEvent<any>) {
    const canvas = new OffscreenCanvas(0, 0)
    const ctx = canvas.getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D
    const { settings, styleUrl, zoom, offset, maxImageSize, imageSize } = e.data as T
    const { x0, y0, x1, centerX, centerY } = getExtentInWorldCoords(
      settings.lng,
      settings.lat,
      settings.size,
      offset,
      1024,
    )
    const zx0 = x0 * (2 ** zoom)
    const zy0 = y0 * (2 ** zoom)
    const zx1 = x1 * (2 ** zoom)
    const centerZX = centerX * (2 ** zoom)
    const centerZY = centerY * (2 ** zoom)
    const side = zx1 - zx0
    const cells = Math.ceil(side / 2000)
    let _side = imageSize || Math.round(side)
    if (maxImageSize && _side > maxImageSize) {
      _side = maxImageSize
    }
    const scale = _side / side
    if (_side > 16384) {
      throw new Error('Image size exceeds 16384px.')
    }
    canvas.width = _side
    canvas.height = _side

    let topleftPos: Position[] = []
    let centerPos: Position[] = []
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        topleftPos.push([zx0 + x * 2000, zy0 + y * 2000])
        centerPos.push([zx0 + x * 2000 + 1000, zy0 + y * 2000 + 1000])
      }
    }

    if (settings.angle !== 0) {
      topleftPos = rotate(topleftPos, settings.angle, centerZX, centerZY)
      centerPos = rotate(centerPos, settings.angle, centerZX, centerZY)
    }

    const bearing = (settings.angle >= 0) ? settings.angle : settings.angle + 360
    const tiles = new Array<Promise<R>>(centerPos.length)

    // fetch tiles
    for (let i = 0; i < cells; i++) {
      for (let j = 0; j < cells; j++) {
        const lng = pixel2lng(centerPos[j + i * cells][0], zoom, 1024)
        const lat = pixel2lat(centerPos[j + i * cells][1], zoom, 1024)

        const url = 'https://api.mapbox.com/styles/v1/' +
          `${styleUrl}/static/` +
          `${lng},${lat},${zoom},${bearing}` +
          `/1005x1005@2x?access_token=${settings.accessToken}&attribution=false&logo=false`
        tiles[j + i * cells] = fetchImage(url)
      }
    }
    const tileList = await Promise.allSettled(tiles)

    const processTiles = async (list: PromiseSettledResult<R>[]) => {
      const tilePromises = list.map(async (tile, index) => {
        if (tile.status === 'fulfilled') {
          const { data, error } = tile.value
          if (error) {
            console.error(error)
            throw error
          }
          if (data) {
            const image = await createImageBitmap(data)
            const dx = Math.floor(index % cells) * 2000 - 5
            const dy = Math.floor(index / cells) * 2000 - 5
            ctx.drawImage(image, dx * scale, dy * scale, image.width * scale, image.height * scale)
            image.close()
          }
        } else {
          throw tile.reason
        }
      })
      await Promise.all(tilePromises)
    }
    await processTiles(tileList)

    // logo
    const logoCanvas = new OffscreenCanvas(90, 21)
    const logoCtx = logoCanvas.getContext('2d') as OffscreenCanvasRenderingContext2D
    const response = await fetch(logoUrl)
    const svgText = await response.text()
    const v = Canvg.fromString(logoCtx, svgText, { DOMParser })
    v.resize(180, 42)
    await v.render()
    ctx.drawImage(logoCanvas, 0, canvas.height - 45)


    // attribution
    const attrText = styleUrl.includes('satellite') ? ATTR_RAS : ATTR
    ctx.font = '20px "Helvetica Neue", Arial, Helvetica, sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    const textWidth = ctx.measureText(attrText).width + 10
    ctx.fillRect(canvas.width - textWidth, canvas.height - 30, textWidth, 30)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'bottom'
    ctx.fillText(attrText, canvas.width - 5, canvas.height - 2)

    // encode
    const imageData = new Uint8Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data)
    const compression = _side > 4096 ? 'Best' : 'Default'
    await initPng()
    const png = await encode_png(
      { data: imageData },
      _side,
      _side,
      'Rgba',
      'Eight',
      compression,
    )

    // clear canvas
    clearCanvas(logoCtx)
    clearCanvas(ctx)

    this.worker.postMessage(png.data)
  }
}

export default new GetCustomMapImage()
