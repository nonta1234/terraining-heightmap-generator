import { FetchError } from 'ofetch'

type T = {
  data: globalThis.Ref<Blob | null>;
  error: globalThis.Ref<FetchError<any> | null>;
}


export const getHeightMap = async () => {
  const mapbox = useMapbox()

  const mapSizePixelsWithBuffer = mapSpec[mapbox.value.settings.gridInfo].mapPixels + 2  // 1083px (cs1)
  const mapPixels = mapSizePixelsWithBuffer + 1   // 1084px (cs1)
  const mapFases = mapSpec[mapbox.value.settings.gridInfo].mapPixels - 1
  const tmpAreaSize = mapbox.value.settings.size / mapFases * mapPixels
  const pixelsPerTile = 512  // number of pixels in terrain-tiles

  // considering rotation, set area using circumscribed extent

  // in high latitudes, calculate the zoom level
  // at which the edge length of a map becomes 1083px or more

  const { topleft, bottomright } = getExtent(
    mapbox.value.settings.lng,
    mapbox.value.settings.lat,
    tmpAreaSize * Math.SQRT2 / 2,
    tmpAreaSize * Math.SQRT2 / 2,
  )

  let referenceLat: number

  if (Math.abs(topleft[1]) >= Math.abs(bottomright[1])) {
    referenceLat = topleft[1]
  } else {
    referenceLat = bottomright[1]
  }

  const zoom = calculateZoomLevel(referenceLat, tmpAreaSize, mapPixels, pixelsPerTile)

  const x = lng2tile(topleft[0], zoom)
  const y = lat2tile(topleft[1], zoom)
  const x2 = lng2tile(bottomright[0], zoom)
  const y2 = lat2tile(bottomright[1], zoom)
  const tileCount = Math.max(x2 - x + 1, y2 - y + 1)

  const posX0 = lng2pixel(topleft[0], zoom, pixelsPerTile)
  const posY0 = lat2pixel(topleft[1], zoom, pixelsPerTile)
  const posX1 = lng2pixel(bottomright[0], zoom, pixelsPerTile)
  const posY1 = lat2pixel(bottomright[1], zoom, pixelsPerTile)
  const centerX = lng2pixel(mapbox.value.settings.lng, zoom, pixelsPerTile)
  const centerY = lat2pixel(mapbox.value.settings.lat, zoom, pixelsPerTile)

  const mapWidth = posX1 - posX0
  const mapHeight = posY1 - posY0

  const tilePosX = x * pixelsPerTile
  const tilePosY = y * pixelsPerTile

  const tilePixels = tileCount * pixelsPerTile
  const mapPixelsOnTile = Math.sqrt(mapWidth * mapWidth + mapHeight * mapHeight) / Math.SQRT2
  const scale = mapPixelsOnTile / (mapPixels * Math.SQRT2)

  const offsetX = centerX - tilePosX
  const offsetY = centerY - tilePosY

  const tiles = new Array<Promise<T>>(Math.pow(tileCount, 2))

  const tileCanvas = ref<HTMLCanvasElement>()
  tileCanvas.value = document.getElementById('tile-canvas') as HTMLCanvasElement
  tileCanvas.value.width = tilePixels
  tileCanvas.value.height = tilePixels

  const tileCtx = tileCanvas.value.getContext('2d', { storage: 'discardable', willReadFrequently: true }) as CanvasRenderingContext2D
  tileCtx.fillStyle = 'rgb(1, 134, 160)'    // = 0m
  tileCtx.fillRect(0, 0, tileCanvas.value.width, tileCanvas.value!.height)

  for (let i = 0; i < tileCount; i++) {
    for (let j = 0; j < tileCount; j++) {
      tiles[j + i * tileCount] = useFetchTerrainTiles(zoom, x + j, y + i)
    }
  }

  const tileList = await Promise.allSettled(tiles)
  const pixelData = (await processTiles(tileList)).data

  const elevations = decodeElevation(pixelData)

  const heightMap = new Array<number>(mapSizePixelsWithBuffer * mapSizePixelsWithBuffer)

  const cosTheta = Math.cos(-mapbox.value.settings.angle * Math.PI / 180)
  const sinTheta = Math.sin(-mapbox.value.settings.angle * Math.PI / 180)

  const halfSize = (mapSizePixelsWithBuffer - 1) / 2  // 541px (cs1)

  // affine transformation & bilinear interpolation

  for (let y = 0; y < mapSizePixelsWithBuffer; y++) {
    for (let x = 0; x < mapSizePixelsWithBuffer; x++) {
      const posX = offsetX + scale * (cosTheta * (x - halfSize) + sinTheta * (y - halfSize))
      const posY = offsetY + scale * (cosTheta * (y - halfSize) - sinTheta * (x - halfSize))

      const x0 = Math.floor(posX)
      const y0 = Math.floor(posY)
      const x1 = Math.ceil(posX)
      const y1 = Math.ceil(posY)

      const val0 = elevations[y0 * tilePixels + x0]
      const val1 = elevations[y0 * tilePixels + x1]
      const val2 = elevations[y1 * tilePixels + x0]
      const val3 = elevations[y1 * tilePixels + x1]

      const eX = x1 - posX
      const eY = y1 - posY
      const dX = posX - x0
      const dY = posY - y0

      const val = (eX * eY * val0) + (dX * eY * val1) + (eX * dY * val2) + (dX * dY * val3)
      heightMap[y * mapSizePixelsWithBuffer + x] = val
    }
  }

  /*
   * affine transformation
   *
   * a, b: offset x, y
   * m: mapsize / 2
   * θ = -angle * π / 180
   * x = a - m * s * cos(θ) + s * x * cos(θ) - m * s * sin(θ) + s * y * sin(θ)
   * y = b - m * s * cos(θ) + s * y * cos(θ) + m * s * sin(θ) - s * x * sin(θ)
   *
   *
   * bilinear interpolation
   *
   * 1 - x = d
   *
   *      eX   dX
   *    0--------
   * eY |        |
   *    |     .__|
   * dY |     |  |
   *     --------1
  */

  // functions ---------------------------------------------------------------------------------------

  async function processTiles(list: PromiseSettledResult<T>[]) {
    const tilePromises = list.map(async (tile, index) => {
      if (tile.status === 'fulfilled') {
        const blob = tile.value.data.value
        if (blob) {
          const png = await createImageBitmap(blob)
          const dx = Math.floor(index % tileCount) * pixelsPerTile
          const dy = Math.floor(index / tileCount) * pixelsPerTile
          tileCtx.drawImage(png, dx, dy)
        }
      }
    })
    await Promise.all(tilePromises)
    return tileCtx.getImageData(0, 0, tileCanvas.value!.width, tileCanvas.value!.height)
  }


  function decodeElevation(arr: Uint8ClampedArray) {
    const elevs = new Array<number>(arr.length / 4)
    let arrIndex = 0
    for (let i = 0; i < elevs.length; i++) {
      elevs[i] = terrainRGB2Height(arr[arrIndex], arr[arrIndex + 1], arr[arrIndex + 2])
      arrIndex += 4
    }
    return elevs
  }

  return heightMap
}
