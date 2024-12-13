import * as Comlink from 'comlink'
import type { SingleMapOption, MapOption, ProgressData } from '~/types/types'
import { mixArray, getMinMaxHeight } from '~/utils/elevation'
import { splitTile, scaleUpBicubic, blendMapsWithFeathering } from '~/utils/tileProcess'
import { getHeightmap } from '~/utils/getHeightmap'
import { getWaterMap } from '~/utils/getWaterMap'
import { gaussianBlur, unsharpMask, noise } from '~/utils/effects'

class MapProcessWorker {
  private index: number | undefined
  private progressCallback: ((data: ProgressData) => void) | undefined

  private validateCallback() {
    if (!this.progressCallback) {
      throw new Error('MapProcessWorker: Setting a callback function is required.')
    }
  }

  public async initialize(index: number, progressCallback: (data: ProgressData) => void) {
    this.index = index
    this.progressCallback = progressCallback
  }

  public getIndex() {
    return this.index
  }

  public async getMapData(option: SingleMapOption) {
    this.validateCallback()

    try {
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

      const resultHeightmap = oceanMap ? mixArray(heightmap, oceanMap) : heightmap

      const transferables: (ArrayBufferLike | ImageBitmap)[] = [resultHeightmap.buffer, waterMap.buffer, waterWayMap.buffer]

      if (waterMapImage) {
        transferables.push(waterMapImage)
      }

      if (waterWayMapImage) {
        transferables.push(waterWayMapImage)
      }

      return Comlink.transfer(
        {
          heightmap: resultHeightmap,
          waterMap,
          waterWayMap,
          waterMapImage,
          waterWayMapImage,
        },
        transferables,
      )
    } catch (error) {
      console.error(error)
    }
  }

  public async applyEffects(mapData: Float32Array, option: MapOption) {
    this.validateCallback()

    try {
      this.progressCallback!({ type: 'phase', data: `Processing effects (#${this.index})` })

      const { settings, smoothRadius, sharpenRadius, unitSize } = option

      const blurredMap = settings.smoothing > 0
        ? await gaussianBlur(mapData, smoothRadius, settings.smoothing / 100, settings.smthThres, settings.smthFade) ?? mapData
        : mapData

      const effectedMap = settings.sharpen > 0
        ? await unsharpMask(blurredMap, settings.sharpen / 100, sharpenRadius, settings.shrpThres, settings.shrpFade) ?? blurredMap
        : blurredMap

      const noiseMap = settings.noise > 0
        ? await noise(effectedMap, settings.noise, settings.noiseThres, unitSize, settings.shrpThres, settings.shrpFade)
        : undefined

      const transferables: (ArrayBufferLike | ImageBitmap)[] = [effectedMap.buffer]

      if (noiseMap) {
        transferables.push(noiseMap.buffer)
      }

      return Comlink.transfer(
        {
          effectedMap,
          noiseMap,
        },
        transferables,
      )
    } catch (error) {
      console.error(error)
    }
  }

  public async splitTile(data: Float32Array, divisions: number, padding: number) {
    this.validateCallback()
    this.progressCallback!({ type: 'phase', data: `Splitting map tile for segmentation. (#${this.index})` })
    const results = await splitTile(data, divisions, padding)
    const transferables = results.map(tile => tile.buffer)

    return Comlink.transfer(
      results,
      transferables,
    )
  }

  public async scaleUpBicubic(data: Float32Array) {
    this.validateCallback()
    this.progressCallback!({ type: 'phase', data: `Making world map high resolution. (#${this.index})` })

    const result = await scaleUpBicubic(data)

    return Comlink.transfer(
      result,
      [result!.buffer],
    )
  }

  public async blendMapsWithFeathering(worldMap: Float32Array, heightmap: Float32Array, featherSize: number) {
    this.validateCallback()
    this.progressCallback!({ type: 'phase', data: `Blending maps. (#${this.index})` })

    const result = await blendMapsWithFeathering(worldMap, heightmap, featherSize)

    return Comlink.transfer(
      result,
      [result.buffer],
    )
  }

  public async combineMap(heightmap: Float32Array, noiseMap: Float32Array | undefined, waterMap: Float32Array, waterWayMap: Float32Array, option: MapOption, getMinMax: boolean) {
    this.validateCallback()
    this.progressCallback!({ type: 'phase', data: `Combining map data (#${this.index})` })

    const { depth, streamDepth } = option.settings
    const result = new Float32Array(heightmap.length)

    for (let i = 0; i < heightmap.length; i++) {
      const landArea = waterMap[i] * waterWayMap[i] === 1 ? 1 : 0
      const waterDepth = Math.max((1 - waterMap[i]) * depth, (1 - waterWayMap[i]) * streamDepth)
      const noise = noiseMap ? noiseMap[i] : 0
      result[i] = heightmap[i] + landArea * noise - waterDepth
    }

    const { min, max } = getMinMax ? await getMinMaxHeight(result, 100) : { min: 0, max: 0 }

    return Comlink.transfer(
      {
        result,
        min,
        max,
      },
      [result.buffer],
    )
  }

  public async extractMap(data: Float32Array, startX: number, startY: number, cropSize: number) {
    const imageSize = Math.sqrt(data.length)
    const result = new Float32Array(cropSize * cropSize)
    for (let y = 0; y < cropSize; y++) {
      const originalStartIndex = (startY + y) * imageSize + startX
      const cropStartIndex = y * cropSize
      result.set(data.subarray(originalStartIndex, originalStartIndex + cropSize), cropStartIndex)
    }
    return Comlink.transfer(result, [result.buffer])
  }
}

Comlink.expose(new MapProcessWorker())
export type MapProcessWorkerType = InstanceType<typeof MapProcessWorker>
