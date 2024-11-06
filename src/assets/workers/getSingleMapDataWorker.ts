import * as Comlink from 'comlink'
import type { SingleMapOption, MapData, ProgressData, ResultType } from '~/types/types'
import { mixArray, getMinMaxHeight } from '~/utils/elevation'
import { getHeightmap } from '~/utils/getHeightmap'
import { getWaterMap } from '~/utils/getWaterMap'
import { gaussianBlur, unsharpMask, noise } from '~/utils/effects'
import effectWasm, { type InitOutput as effectInitOutput } from '~~/effects_lib/pkg'
import heightmapWasm, { Heightmap, type InitOutput as heightmapInitOutput } from '~~/heightmap_lib/pkg'

class GetSingleMapDataWorker {
  private effectInstance?: effectInitOutput
  private heightmapInstance?: heightmapInitOutput
  private heightmapController?: Heightmap
  private mapData?: MapData
  private progressCallback: ((data: ProgressData) => void) | undefined

  public async initialize(progressCallback: (data: ProgressData) => void) {
    this.effectInstance = await effectWasm()
    this.heightmapInstance = await heightmapWasm()
    this.heightmapController = new Heightmap()
    this.progressCallback = progressCallback
  }

  public terminate() {
    this.cleanup()
    self.close()
  }

  private setWasmMapData(buffer: ArrayBuffer, pointer: number, data: Float32Array) {
    const wasmData = new Float32Array(buffer, pointer, data.length)
    wasmData.set(data)
  }

  private validateMapData() {
    if (!this.mapData || !this.mapData.heightmap) throw new Error('GetSingleMapDataWorker: Map data is not initialized.')

    const dataLength = this.mapData.heightmap.length
    const isValidLength = Object.values(this.mapData).every(arr =>
      arr instanceof Float32Array ? arr.length === dataLength : true,
    )

    if (!isValidLength) {
      throw new Error('GetSingleMapDataWorker: All data arrays must be the same size.')
    }
  }

  private setMapDataToController() {
    this.validateMapData()
    if (!this.heightmapInstance || !this.heightmapController || !this.mapData || !this.mapData.heightmap) return

    this.heightmapController.allocate_map_buffer(this.mapData.heightmap.length)

    const pointerMap = {
      heightmap: this.heightmapController.pointer_to_heightmap,
      blurredMap: this.heightmapController.pointer_to_blurredmap,
      sharpenMap: this.heightmapController.pointer_to_sharpenmap,
      noisedMap: this.heightmapController.pointer_to_noisedmap,
      waterMap: this.heightmapController.pointer_to_watermap,
      waterWayMap: this.heightmapController.pointer_to_waterwaymap,
    }

    Object.entries(pointerMap).forEach(([key, pointer]) => {
      const data = this.mapData![key as keyof typeof this.mapData] as Float32Array
      this.setWasmMapData(this.heightmapInstance!.memory.buffer, pointer, data)
    })
  }

  private cleanupData() {
    if (this.heightmapController) {
      this.heightmapController.clear_buffers()
    }

    if (this.mapData) {
      this.mapData.waterMapImage?.close()
      this.mapData.waterWayMapImage?.close()
      this.mapData = undefined
    }
  }

  private cleanup() {
    this.cleanupData()
    this.heightmapController = undefined
    this.heightmapInstance = undefined
    this.effectInstance = undefined
  }

  public async generateMap(option: SingleMapOption) {
    if (!this.progressCallback) {
      throw new Error('GetSingleMapDataWorker: Setting a callback function is required.')
    }
    this.cleanupData()
    const {
      settings,
      rasterExtent,
      vectorExtent,
      mapPixels,
      unitSize,
      isDebug,
    } = option

    const rasterPixels = 512
    const vectorPixels = 4096

    const [heightmap, oceanMap, { waterMap, waterWayMap, waterMapImage, waterWayMapImage }] = settings.actualSeafloor
      ? await Promise.all([
        getHeightmap(settings.gridInfo, settings, rasterExtent, mapPixels, rasterPixels,
          total => this.progressCallback!({ type: 'total', data: total }),
          () => this.progressCallback!({ type: 'progress' }),
        ),
        getHeightmap('ocean', settings, rasterExtent, mapPixels, rasterPixels,
          total => this.progressCallback!({ type: 'total', data: total }),
          () => this.progressCallback!({ type: 'progress' }),
        ),
        getWaterMap(settings, vectorExtent, mapPixels, unitSize, false, vectorPixels, isDebug,
          total => this.progressCallback!({ type: 'total', data: total }),
          () => this.progressCallback!({ type: 'progress' }),
        ),
      ])
      : await Promise.all([
        getHeightmap(settings.gridInfo, settings, rasterExtent, mapPixels, rasterPixels,
          total => this.progressCallback!({ type: 'total', data: total }),
          () => this.progressCallback!({ type: 'progress' }),
        ),
        undefined,
        getWaterMap(settings, vectorExtent, mapPixels, unitSize, true, vectorPixels, isDebug,
          total => this.progressCallback!({ type: 'total', data: total }),
          () => this.progressCallback!({ type: 'progress' }),
        ),
      ])

    this.mapData = {
      heightmap: oceanMap ? mixArray(heightmap, oceanMap) : heightmap,
      waterMap,
      waterWayMap,
      waterMapImage,
      waterWayMapImage,
    }
  }

  public async applyEffects(option: SingleMapOption) {
    if (!this.effectInstance) throw new Error('GetSingleMapDataWorker: Effect instance not initialized.')
    if (!this.mapData?.heightmap) throw new Error('GetSingleMapDataWorker: Heightmap not generated.')

    const { settings, smoothRadius, sharpenRadius, unitSize } = option

    const [blurredMap, sharpenMap] = await Promise.all([
      settings.smoothing > 0 ? gaussianBlur(this.effectInstance, this.mapData.heightmap, smoothRadius, settings.smoothing / 100) : this.mapData.heightmap,
      settings.sharpen > 0 ? unsharpMask(this.effectInstance, this.mapData.heightmap, settings.sharpen / 100, sharpenRadius) : this.mapData.heightmap,
    ])

    const noisedMap = await noise(this.effectInstance, sharpenMap, settings.noise, settings.noiseThres, unitSize)

    Object.assign(this.mapData, { blurredMap, sharpenMap, noisedMap })
  }

  public combine(option: SingleMapOption): ResultType {
    if (!this.heightmapController || !this.heightmapInstance) {
      throw new Error('GetSingleMapDataWorker: Initialization required.')
    }
    if (!this.mapData || !this.mapData.heightmap) {
      throw new Error('GetSingleMapDataWorker: Map data generation is required.')
    }

    this.setMapDataToController()

    const { settings } = option as SingleMapOption

    this.heightmapController.combine_heightmaps(
      settings.depth,
      settings.streamDepth,
      settings.smthThres,
      settings.smthFade,
      settings.shrpThres,
      settings.shrpFade,
    )

    const combinedData = new Float32Array(
      this.heightmapInstance.memory.buffer,
      this.heightmapController.pointer_to_result,
      this.mapData.heightmap.length,
    )

    const { min, max } = getMinMaxHeight(combinedData, 100)
    const resultData = new Float32Array(combinedData.length)
    resultData.set(combinedData)

    const transferables: (ArrayBufferLike | ImageBitmap)[] = [resultData.buffer]

    if (this.mapData.waterMapImage) {
      transferables.push(this.mapData.waterMapImage)
    }

    if (this.mapData.waterWayMapImage) {
      transferables.push(this.mapData.waterWayMapImage)
    }

    return Comlink.transfer(
      {
        heightmap: resultData,
        waterMapImage: this.mapData.waterMapImage,
        waterWayMapImage: this.mapData.waterWayMapImage,
        min,
        max,
      },
      transferables,
    )
  }

  public getMapData() {
    if (!this.mapData) {
      throw new Error('GetSingleMapDataWorker: Map data generation is required.')
    }

    return Comlink.transfer(
      {
        heightmap: this.mapData.heightmap!,
        waterMap: this.mapData.waterMap!,
        waterWayMap: this.mapData.waterWayMap!,
      },
      [this.mapData.heightmap!.buffer, this.mapData.waterMap!.buffer, this.mapData.waterWayMap!.buffer],
    )
  }

  public setMapData(heightmap: Float32Array, waterMap: Float32Array, waterWayMap: Float32Array) {
    this.mapData = {
      heightmap,
      waterMap,
      waterWayMap,
    }
  }
}

Comlink.expose(new GetSingleMapDataWorker())
export type GetSingleMapDataWorkerType = InstanceType<typeof GetSingleMapDataWorker>
