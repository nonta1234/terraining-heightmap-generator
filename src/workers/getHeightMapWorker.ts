import { FetchError } from 'ofetch'
// import * as turf from '@turf/turf'
import type { GenerateMapOption } from '~/types/types'
import { getExtentInWorldCood } from '~/utils/getExtent'
import { mapSpec } from '~/utils/initialValue'
import { useFetchTerrainTiles } from '~/composables/useFetchTiles'

type T = {
  data: Blob | undefined;
  error: FetchError<any> | undefined;
}

const ctx: Worker = self as any

ctx.onmessage = async (e) => {
  const {
    mapType,
    settings,
    token,
  } = e.data.data as GenerateMapOption

  const canvas: OffscreenCanvas = e.data.canvases[0]
  console.log('ok')
  const pixelsPerTile = 512

  const extentOffset = mapType === 'cs2play' ? 0.375 : 0
  const { x0, y0, x1, y1, centerX, centerY } = getExtentInWorldCood(settings.lng, settings.lat, settings.size * 1.5, extentOffset, pixelsPerTile)
  const side = x1 - x0
  const zoom = Math.min(Math.ceil(Math.log2(mapSpec[mapType].mapFaces * 1.5 / side)), 14)
  const scale = mapSpec[mapType].mapFaces / (side * (2 ** zoom))

  const tileX0 = Math.floor(x0 * (2 ** zoom) / pixelsPerTile)
  const tileY0 = Math.floor(y0 * (2 ** zoom) / pixelsPerTile)
  const tileX1 = Math.floor(x1 * (2 ** zoom) / pixelsPerTile)
  const tileY1 = Math.floor(y1 * (2 ** zoom) / pixelsPerTile)
  const tileCount = Math.max(tileX1 - tileX0 + 1, tileY1 - tileY0 + 1)

  const offsetX = centerX - tileX0 * pixelsPerTile
  const offsetY = centerY - tileY0 * pixelsPerTile
  const tilePixels = tileCount * pixelsPerTile

  canvas.width = tilePixels
  canvas.height = tilePixels

  const tileCtx = canvas.getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D
  tileCtx.fillStyle = 'rgb(1, 134, 160)'    // = 0m
  tileCtx.fillRect(0, 0, canvas.width, canvas.height)

  const tiles = new Array<Promise<T>>(Math.pow(tileCount, 2))

  // fetch tiles
  for (let i = 0; i < tileCount; i++) {
    for (let j = 0; j < tileCount; j++) {
      tiles[j + i * tileCount] = useFetchTerrainTiles(zoom, tileX0 + j, tileY0 + i, token)
    }
  }

  const tileList = await Promise.allSettled(tiles)
  const pixelData = (await processTiles(tileList)).data

  const elevations = decodeElevation(pixelData)

  async function processTiles(list: PromiseSettledResult<T>[]) {
    const tilePromises = list.map(async (tile, index) => {
      if (tile.status === 'fulfilled') {
        const blob = tile.value.data
        if (blob) {
          const png = await createImageBitmap(blob)
          const dx = Math.floor(index % tileCount) * pixelsPerTile
          const dy = Math.floor(index / tileCount) * pixelsPerTile
          tileCtx.drawImage(png, dx, dy)
        }
      }
    })
    await Promise.all(tilePromises)
    return tileCtx.getImageData(0, 0, canvas.width, canvas.height)
  }

  ctx.postMessage(elevations, [elevations])
}

export default ctx
