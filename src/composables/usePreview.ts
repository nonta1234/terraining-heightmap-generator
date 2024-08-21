import wasm, { Heightmap } from '~~/heightmap_lib/pkg'

type T = {
  instance: any | undefined
  controller: Heightmap | undefined
  previewMap: Float32Array | undefined
  length: number
  min: number
  max: number
  hasData: boolean
}

export const usePreview = () => {
  const previewData = useState<T>('preview-heightmap', () => {
    return {
      instance: undefined,
      controller: undefined,
      previewMap: undefined,
      length: 0,
      min: 0,
      max: 0,
      hasData: false,
    }
  })

  const initialize = (previewData: Ref<T>) => async () => {
    previewData.value.instance = await wasm()
    previewData.value.controller = new Heightmap()
  }

  const setMapData = (previewData: Ref<T>) => (heightmap: Float32Array, waterMap: Float32Array, waterWayMap: Float32Array) => {
    if (!(heightmap.length === waterMap.length && waterMap.length === waterWayMap.length)) {
      throw new Error('All data must be the same size.')
    }

    previewData.value.length = heightmap.length
    previewData.value.controller?.allocate_map_buffer(previewData.value.length)

    const heightmapData = new Float32Array(
      previewData.value.instance.memory.buffer,
      previewData.value.controller?.pointer_to_heightmap,
      previewData.value.length,
    )
    heightmapData.set(heightmap)

    const oceanMapData = new Float32Array(
      previewData.value.instance.memory.buffer,
      previewData.value.controller?.pointer_to_watermap,
      previewData.value.length,
    )
    oceanMapData.set(waterMap)

    const waterWayMapData = new Float32Array(
      previewData.value.instance.memory.buffer,
      previewData.value.controller?.pointer_to_waterwaymap,
      previewData.value.length,
    )
    waterWayMapData.set(waterWayMap)

    previewData.value.hasData = true
  }

  /**
   * If there is no data, return false without throwing an error.
   * @return Promise\<boolean\>
   */
  const generate = (previewData: Ref<T>) => async () => {
    if (previewData.value.hasData) {
      const resultData = new Float32Array(
        previewData.value.instance.memory.buffer,
        previewData.value.controller?.pointer_to_result,
        previewData.value.length,
      )
      const { settings } = useMapbox().value
      if (settings.actualSeafloor) {
        previewData.value.controller?.combine_heightmaps(settings.streamDepth)
      } else {
        previewData.value.controller?.combine_heightmaps_with_littoral(settings.depth, settings.streamDepth)
      }
      const { min, max } = getMinMaxHeight(resultData, 100)
      previewData.value.min = min
      previewData.value.max = max
      previewData.value.previewMap = new Float32Array(resultData)
      return true
    } else {
      return false
    }
  }

  return {
    previewData: readonly(previewData),
    initialize: initialize(previewData),
    setMapData: setMapData(previewData),
    /**
     * If there is no data, return false without throwing an error.
     * @return Promise\<boolean\>
     */
    generate: generate(previewData),
  }
}