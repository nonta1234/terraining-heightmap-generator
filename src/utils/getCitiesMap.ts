import type { MapType, Canvases } from '~/types/types'

const setImageBitmap = (canvas: OffscreenCanvas, image: ImageBitmap) => {
  canvas.width = image.width
  canvas.height = image.height
  const ctx = canvas.getContext('bitmaprenderer')
  ctx!.transferFromImageBitmap(image)
}


export const getCitiesMap = async (mapType: MapType) => {
  try {
    const mapbox = useMapbox()
    const { debugMode } = useDebug()
    const {
      osTileCanvas,
      osWaterCanvas,
      osWaterWayCanvas,
      osLittCanvas,
      osCornerCanvas,
    } = useState<Canvases>('canvases').value

    if (mapType === 'cs1') {
      const heightmapData = async () => {
        const { heightmap, heightmapImage } = await getHeightmap('cs1', debugMode.value)
        const minmax = getMinMaxHeight(heightmap)
        return { heightmap, heightmapImage, minmax }
      }
      const waterMapData = async () => {
        const {
          waterMap,
          waterWayMap,
          waterMapImage,
          waterWayMapImage,
          littImage,
          cornerImage,
        } = await getWaterMap('cs1', debugMode.value)
        return {
          waterMap,
          waterWayMap,
          waterMapImage,
          waterWayMapImage,
          littImage,
          cornerImage,
        }
      }
      const results = await Promise.all([
        heightmapData(),
        waterMapData(),
      ])

      if (mapbox.value.settings.adjLevel) {
        mapbox.value.settings.seaLevel = results[0].minmax.min
      }
      adjustElevation(results[0].minmax.max)
      const citiesMap = await generateCitiesMap('cs1', results[0].heightmap, results[1].waterMap, results[1].waterWayMap)

      if (debugMode.value) {
        setImageBitmap(osTileCanvas, results[0].heightmapImage!)
        setImageBitmap(osWaterCanvas, results[1].waterMapImage!)
        setImageBitmap(osWaterWayCanvas, results[1].waterWayMapImage!)
        setImageBitmap(osLittCanvas, results[1].littImage!)
        setImageBitmap(osCornerCanvas, results[1].cornerImage!)
      }
      return { heightmap: citiesMap }
    } else {
      let heightmapView = false
      let worldMapView = false
      if (debugMode.value) {
        const { viewMode } = useViewMode()
        heightmapView = viewMode.value === 'height'
        worldMapView = viewMode.value === 'world'
      }
      const playHeightmapData = async () => {
        const { heightmap } = await getHeightmap('cs2play')
        const minmax = getMinMaxHeight(heightmap)
        return { heightmap, minmax }
      }
      const playWaterMapData = async () => {
        const {
          waterMap,
          waterWayMap,
          waterMapImage,
          waterWayMapImage,
          littImage,
          cornerImage,
        } = await getWaterMap('cs2play', heightmapView)
        return {
          waterMap,
          waterWayMap,
          waterMapImage,
          waterWayMapImage,
          littImage,
          cornerImage,
        }
      }
      const heightmapData = async () => {
        const { heightmap, heightmapImage } = await getHeightmap('cs2', debugMode.value)
        const minmax = getMinMaxHeight(heightmap)
        return { heightmap, heightmapImage, minmax }
      }
      const waterMapData = async () => {
        const {
          waterMap,
          waterWayMap,
          waterMapImage,
          waterWayMapImage,
          littImage,
          cornerImage,
        } = await getWaterMap('cs2', worldMapView)
        return {
          waterMap,
          waterWayMap,
          waterMapImage,
          waterWayMapImage,
          littImage,
          cornerImage,
        }
      }
      const results = await Promise.all([
        playHeightmapData(),
        playWaterMapData(),
        heightmapData(),
        waterMapData(),
      ])

      const min = Math.min(results[0].minmax.min, results[2].minmax.min)
      const max = Math.max(results[0].minmax.max, results[2].minmax.max)

      if (mapbox.value.settings.adjLevel) {
        mapbox.value.settings.seaLevel = min
      }
      adjustElevation(max)

      const resultHeightmap = await generateCitiesMap('cs2play', results[0].heightmap, results[1].waterMap, results[1].waterWayMap)
      const resultWorldMap = await generateCitiesMap('cs2', results[2].heightmap, results[3].waterMap, results[3].waterWayMap)

      if (debugMode.value) {
        const { viewMode } = useViewMode()
        const n = viewMode.value === 'world' ? 3 : 1
        setImageBitmap(osTileCanvas, results[2].heightmapImage!)
        setImageBitmap(osWaterCanvas, results[n].waterMapImage!)
        setImageBitmap(osWaterWayCanvas, results[n].waterWayMapImage!)
        setImageBitmap(osLittCanvas, results[n].littImage!)
        setImageBitmap(osCornerCanvas, results[n].cornerImage!)
      }
      return { heightmap: resultHeightmap, worldMap: resultWorldMap }
    }
  } catch (error) {
    console.error('An error occurred in getCitiesMap:', error)
    if ((error as Error).message === 'Invaid access token') {
      alert(NEED_TOKEN)
    }
    throw error
  }
}
