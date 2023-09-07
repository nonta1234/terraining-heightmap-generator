import CalcMapWorker from '~/workers/calcCitiesMap.js?worker'

type MessageData = {
  tmpHeightMap: Float64Array;
  waterMap: Float64Array;
  waterwayMap: Float64Array;
  seaLevel: number;
  vertScale: number;
  smoothing: number;
  smthThres: number;
  smthFade: number;
  sharpen: number;
  shrpThres: number;
  shrpFade: number;
  depth: number;
  streamDepth: number;
  mapSizePixels: number;
  mapSizePixelsWithBuffer: number;
}


const calcMap = (data: MessageData) => {
  return new Promise((resolve) => {
    const worker = new CalcMapWorker()
    worker.postMessage(data, [data.tmpHeightMap.buffer, data.waterMap.buffer, data.waterwayMap.buffer])
    worker.addEventListener('message', (e) => {
      if (e.data) {
        resolve(e.data)
        worker.terminate()
      }
    }, false)
  })
}


export const getCitiesMap = async () => {
  const mapbox = useMapbox()
  // get map data
  const tmpHeightMap = await getHeightMap()
  // getCSV(tmpHeightMap, 1083)

  const { waterMap, waterwayMap } = await getWaterMap()
  const { min, max } = getMinMaxHeight(tmpHeightMap)

  if (mapbox.value.settings.adjLevel) {
    mapbox.value.settings.seaLevel = min
  }
  adjustElevation(max)

  const messageData: MessageData = {
    tmpHeightMap: new Float64Array(tmpHeightMap),
    waterMap: new Float64Array(waterMap),
    waterwayMap: new Float64Array(waterwayMap),
    seaLevel: mapbox.value.settings.seaLevel,
    vertScale: mapbox.value.settings.vertScale,
    smoothing: mapbox.value.settings.smoothing,
    smthThres: mapbox.value.settings.smthThres,
    smthFade: mapbox.value.settings.smthFade,
    sharpen: mapbox.value.settings.sharpen,
    shrpThres: mapbox.value.settings.shrpThres,
    shrpFade: mapbox.value.settings.shrpFade,
    depth: mapbox.value.settings.depth,
    streamDepth,
    mapSizePixels: mapSpec[mapbox.value.settings.gridInfo].mapPixels,
    mapSizePixelsWithBuffer: mapSpec[mapbox.value.settings.gridInfo].mapPixels + 2,
  }

  const citiesMap = await calcMap(messageData) as Uint8ClampedArray

  return citiesMap
}
