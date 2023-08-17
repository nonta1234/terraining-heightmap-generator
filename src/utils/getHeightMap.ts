import { FetchError } from 'ofetch'

type T = {
  data: globalThis.Ref<Blob | null>;
  error: globalThis.Ref<FetchError<any> | null>;
}


export const getHeightMap = async () => {
  const mapbox = useMapbox()

  const mapPixels = mapSizePixelsWithBuffer
  const tmpAreaSize = mapbox.value.settings.size / mapFases * mapPixels
  const pixelsPerTile = 512  // number of pixels in terrain-tiles

  // in high latitudes, calculate the zoom level
  // at which the edge length of a map becomes 1083px or more
  const { topleft, bottomright } = getExtent(
    mapbox.value.settings.lng,
    mapbox.value.settings.lat,
    mapbox.value.settings.size / mapFases * Math.floor(mapSizePixelsWithBuffer / 2),
    mapbox.value.settings.size / mapFases * Math.ceil(mapSizePixelsWithBuffer / 2),
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

  const mapWidth = posX1 - posX0
  const mapHeight = posY1 - posY0

  const tilePosX = x * pixelsPerTile
  const tilePosY = y * pixelsPerTile

  const offsetX = posX0 - tilePosX
  const offsetY = posY0 - tilePosY

  const tilePixels = tileCount * pixelsPerTile
  const mapPixelsOnTile = Math.sqrt(mapWidth * mapWidth + mapHeight * mapHeight) / Math.SQRT2
  const scale = mapPixels / mapPixelsOnTile

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

  const tmpArray = resampleX(elevations, tilePixels, tilePixels, offsetX, scale)
  const transposedArray = transposeArray(tmpArray, tilePixels, mapPixels)
  const resampledArray = resampleX(transposedArray, tilePixels, mapPixels, offsetY, scale)
  const heightMap = transposeArray(resampledArray, mapPixels, mapPixels)


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


  function resampleX(srcData: Array<number>, srcWidth: number, height: number, offset: number, scale: number) {
    const dstData = new Array<number>(height * mapPixels)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < mapPixels; x++) {
        const xPos = y * srcWidth + offset + x / scale
        const x0 = Math.floor(xPos)
        const x1 = Math.ceil(xPos)

        const val0 = srcData[x0]
        const val1 = srcData[x1]

        const interpolatedValue = bilinearInterpolation(val0, val1, xPos - x0)
        dstData[y * mapPixels + x] = interpolatedValue
      }
    }
    return dstData
  }


  function bilinearInterpolation(val0: number, val1: number, t: number) {
    return val0 + (val1 - val0) * t
  }


  return heightMap
}
