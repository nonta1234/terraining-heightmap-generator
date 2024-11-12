import * as Comlink from 'comlink'
import type { SingleMapOption, MultiMapOption, Settings, Extent, ProgressData, ResultType, FileType } from '~/types/types'
import { mapSpec } from '~/utils/const'
import { getMinMaxHeight, mergeTiles, extractArray, splitTile, scaleUpBicubic, integrateHightmapWithFeathering } from '~/utils/elevation'
import { getExtentInWorldCoords, rotateExtent } from '~/utils/getExtent'
import type { GetSingleMapDataWorkerType } from '~/assets/workers/getSingleMapDataWorker'
import GetSingleMapDataWorker from '~/assets/workers/getSingleMapDataWorker.ts?worker'
import initPng, { encode_png } from '~~/png_lib/pkg'

class GetCitiesMapWorker {
  private subWorkers: Comlink.Remote<GetSingleMapDataWorkerType>[]
  private progressCallback: ((data: ProgressData) => void) | undefined
  private isSetSubWorker: boolean

  constructor() {
    this.subWorkers = []
    this.isSetSubWorker = false
  }

  public setCallback(progressCallback: (data: ProgressData) => void) {
    this.progressCallback = progressCallback
  }

  public async setSubWorker(workerCount: number) {
    if (this.isSetSubWorker) return
    this.isSetSubWorker = true

    if (!this.progressCallback) {
      throw new Error('GetCitiesMapWorker: Setting a callback function is required.')
    }
    const count = Math.min(workerCount, 6)

    if (this.subWorkers.length > count) {
      for (let i = count; i < this.subWorkers.length; i++) {
        await this.subWorkers[i].terminate()
      }
      this.subWorkers.length = count
      this.isSetSubWorker = false
    } else {
      while (this.subWorkers.length < count) {
        try {
          const subWorker = Comlink.wrap<GetSingleMapDataWorkerType>(new GetSingleMapDataWorker())
          await subWorker.initialize(this.progressCallback)
          this.subWorkers.push(subWorker)
        } catch (error: any) {
          for (const worker of this.subWorkers) {
            await worker.terminate()
          }
          this.subWorkers = []
          throw new Error(`GetCitiesMapWorker: Initialization of sub worker failed: ${error.message}`)
        } finally {
          this.isSetSubWorker = false
        }
      }
      this.isSetSubWorker = false
    }
  }

  private getExtent(settings: Settings, size: number, offset: number, pixelsPerTile: number) {
    const extentData = getExtentInWorldCoords(settings.lng, settings.lat, size, offset, pixelsPerTile)
    const extent = settings.angle === 0 ? extentData : rotateExtent(extentData, settings.angle, extentData.centerX, extentData.centerY)
    return extent
  }

  private async setMapData(worker: Comlink.Remote<GetSingleMapDataWorkerType>, heightmap: Float32Array, waterMap: Float32Array, waterWayMap: Float32Array) {
    await worker.setMapData(
      Comlink.transfer(heightmap, [heightmap.buffer]),
      Comlink.transfer(waterMap, [waterMap.buffer]),
      Comlink.transfer(waterWayMap, [waterWayMap.buffer]),
    )
  }

  private async generateSingleMap(option: SingleMapOption): Promise<ResultType> {
    if (this.subWorkers.length < 1) {
      await this.setSubWorker(1)
    }

    await this.subWorkers[0].generateMap(option)
    this.progressCallback!({ type: 'phase', data: `Processing effects` })
    await this.subWorkers[0].applyEffects(option)
    this.progressCallback!({ type: 'phase', data: `Combining map data` })
    const result = await this.subWorkers[0].combine(option, true)
    return result
  }

  private async generateMultiMap(option: SingleMapOption): Promise<ResultType> {
    if (this.subWorkers.length < 5) {
      await this.setSubWorker(5)
    }

    await this.subWorkers[4].generateMap(option)

    this.progressCallback!({ type: 'phase', data: `Preparing to process by splitting` })
    const { heightmap, waterMap, waterWayMap } = await this.subWorkers[4].getMapData()

    const { topleft: h_topleft, topright: h_topright, bottomleft: h_bottomleft, bottomright: h_bottomright } = splitTile(heightmap, 100)
    const { topleft: w_topleft, topright: w_topright, bottomleft: w_bottomleft, bottomright: w_bottomright } = splitTile(waterMap, 100)
    const { topleft: ww_topleft, topright: ww_topright, bottomleft: ww_bottomleft, bottomright: ww_bottomright } = splitTile(waterWayMap, 100)

    await Promise.all([
      this.setMapData(this.subWorkers[0], h_topleft, w_topleft, ww_topleft),
      this.setMapData(this.subWorkers[1], h_topright, w_topright, ww_topright),
      this.setMapData(this.subWorkers[2], h_bottomleft, w_bottomleft, ww_bottomleft),
      this.setMapData(this.subWorkers[3], h_bottomright, w_bottomright, ww_bottomright),
    ])

    const results: { heightmap: Float32Array, min: number, max: number }[] = Array(4).fill(null).map(() => ({
      heightmap: new Float32Array(),
      min: 0,
      max: 0,
    }))

    await Promise.all([0, 1, 2, 3].map(async (index) => {
      this.progressCallback!({ type: 'phase', data: `Processing effects (#${index})` })
      await this.subWorkers[index].applyEffects(option)
      this.progressCallback!({ type: 'phase', data: `Combining map data (#${index})` })
      const result = await this.subWorkers[index].combine(option, true)
      this.progressCallback!({ type: 'phase', data: `Tile combining completed (#${index})` })

      results[index] = {
        heightmap: result.heightmap,
        min: result.min,
        max: result.max,
      }
    }))

    const resultHeightmap = mergeTiles(
      results[0].heightmap,
      results[1].heightmap,
      results[2].heightmap,
      results[3].heightmap,
      mapSpec[option.settings.gridInfo].correction,
      100,
    )

    return {
      heightmap: resultHeightmap,
      min: Math.min(results[0].min, results[1].min, results[2].min, results[3].min),
      max: Math.max(results[0].max, results[1].max, results[2].max, results[3].max),
    }
  }

  private async generateCS2Map(option: MultiMapOption): Promise<ResultType> {
    if (this.subWorkers.length < 6) {
      await this.setSubWorker(6)
    }

    const singleMapOptions: SingleMapOption[] = []
    const unitSizes = [option.unitSize, option.unitSize / 4]

    for (let i = 0; i < option.rasterExtents.length; i++) {
      singleMapOptions.push({
        settings: option.settings,
        mapPixels: option.mapPixels,
        unitSize: unitSizes[i],
        smoothRadius: option.smoothRadius,
        sharpenRadius: option.sharpenRadius,
        isDebug: option.isDebug,
        rasterExtent: option.rasterExtents[i],
        vectorExtent: option.vectorExtents[i],
      })
    }

    await Promise.all([
      this.subWorkers[4].generateMap(singleMapOptions[0]),
      this.subWorkers[5].generateMap(singleMapOptions[1]),
    ])

    this.progressCallback!({ type: 'phase', data: `Preparing to process by splitting` })

    const [
      { heightmap, waterMap, waterWayMap },
      { heightmap: h_heightmap, waterMap: h_waterMap, waterWayMap: h_waterWayMap },
    ] = await Promise.all([
      this.subWorkers[4].getMapData(),
      this.subWorkers[5].getMapData(),
    ])

    function asyncScaleUpBicubic(data: Float32Array): Promise<Float32Array> {
      return new Promise((resolve) => {
        const result = scaleUpBicubic(data)
        resolve(result)
      })
    }

    const [su_heightmap, su_waterMap, su_waterWayMap] = await Promise.all([
      asyncScaleUpBicubic(heightmap),
      asyncScaleUpBicubic(waterMap),
      asyncScaleUpBicubic(waterWayMap),
    ])

    function asyncIntegrateHightmapWithFeathering(
      worldMap: Float32Array,
      heightmap: Float32Array,
      featherSize: number,
    ): Promise<Float32Array> {
      return new Promise((resolve) => {
        const result = integrateHightmapWithFeathering(worldMap, heightmap, featherSize)
        resolve(result)
      })
    }

    const [tmp_heightmap, tmp_waterMap, tmp_waterWayMap] = await Promise.all([
      asyncIntegrateHightmapWithFeathering(su_heightmap, h_heightmap, 100),
      asyncIntegrateHightmapWithFeathering(su_waterMap, h_waterMap, 100),
      asyncIntegrateHightmapWithFeathering(su_waterWayMap, h_waterWayMap, 100),
    ])

    function asyncSplitTile(data: Float32Array, overlap: number): Promise<{
      topleft: Float32Array
      topright: Float32Array
      bottomleft: Float32Array
      bottomright: Float32Array
    }> {
      return new Promise((resolve) => {
        const result = splitTile(data, overlap)
        resolve(result)
      })
    }

    const [
      { topleft: tl_heightmap, topright: tr_heightmap, bottomleft: bl_heightmap, bottomright: br_heightmap },
      { topleft: tl_waterMap, topright: tr_waterMap, bottomleft: bl_waterMap, bottomright: br_waterMap },
      { topleft: tl_waterWayMap, topright: tr_waterWayMap, bottomleft: bl_waterWayMap, bottomright: br_waterWayMap },
    ] = await Promise.all([
      asyncSplitTile(tmp_heightmap, 100),
      asyncSplitTile(tmp_waterMap, 100),
      asyncSplitTile(tmp_waterWayMap, 100),
    ])

    await Promise.all([
      this.setMapData(this.subWorkers[0], tl_heightmap, tl_waterMap, tl_waterWayMap),
      this.setMapData(this.subWorkers[1], tr_heightmap, tr_waterMap, tr_waterWayMap),
      this.setMapData(this.subWorkers[2], bl_heightmap, bl_waterMap, bl_waterWayMap),
      this.setMapData(this.subWorkers[3], br_heightmap, br_waterMap, br_waterWayMap),
    ])

    const results: { heightmap: Float32Array, min: number, max: number }[] = Array(4).fill(null).map(() => ({
      heightmap: new Float32Array(),
      min: 0,
      max: 0,
    }))

    await Promise.all([0, 1, 2, 3].map(async (index) => {
      this.progressCallback!({ type: 'phase', data: `Processing effects (#${index})` })
      await this.subWorkers[index].applyEffects(option)
      this.progressCallback!({ type: 'phase', data: `Combining map data (#${index})` })
      const result = await this.subWorkers[index].combine(option, false)
      this.progressCallback!({ type: 'phase', data: `Tile combining completed (#${index})` })

      results[index] = {
        heightmap: result.heightmap,
        min: result.min,
        max: result.max,
      }
    }))

    const resultHeightmap = mergeTiles(
      results[0].heightmap,
      results[1].heightmap,
      results[2].heightmap,
      results[3].heightmap,
      mapSpec[option.settings.gridInfo].correction,
      100,
    )

    return {
      heightmap: resultHeightmap,
      min: 0,
      max: 0,
    }
  }

  private async encode(mode: 'raw' | 'png', data: ResultType, settings: Settings, resolution: number, map: 'heightmap' | 'worldMap' = 'heightmap') {
    const base = settings.adjToMin ? data.min : settings.baseLevel
    const elevationRange = data.max - data.min
    const unitScale = settings.elevationScale / 65535

    let scaleFactor = 1
    if (settings.type === 'limit') {
      scaleFactor = elevationRange * settings.vertScale > settings.elevationScale ? settings.elevationScale / elevationRange : settings.vertScale
    } else if (settings.type === 'maximize') {
      scaleFactor = settings.elevationScale / elevationRange
    } else {
      scaleFactor = settings.vertScale
    }

    const resultHeightmap = map === 'heightmap'
      ? data.heightmap.map(value => ((value - base) * scaleFactor) / unitScale)
      : data.worldMap!.map(value => ((value - base) * scaleFactor) / unitScale)

    const clampedArrayMap = new Uint8ClampedArray(resolution * resolution * 2)

    for (let i = 0; i < resultHeightmap.length; i++) {
      const h = Math.max(Math.round(resultHeightmap[i]), 0)
      clampedArrayMap[i * 2] = h >> 8
      clampedArrayMap[i * 2 + 1] = h & 255
    }

    const resultMap = new Uint8Array(clampedArrayMap)


    if (mode === 'png') {
      this.progressCallback!({ type: 'phase', data: `Encoding data` })

      const png = await encode_png(
        { data: resultMap },
        settings.resolution,
        settings.resolution,
        'Grayscale',
        'Sixteen',
        'Best',
      )

      return png
    } else {
      return resultMap
    }
  }

  public async generateMap(mode: 'preview' | 'raw' | 'png', settings: Settings, resolution: number, isDebug: boolean): Promise<FileType | ResultType> {
    try {
      if (!this.progressCallback) {
        throw new Error('GetCitiesMapWorker: Setting a callback function is required.')
      }
      const rasterPixels = 512
      const vectorPixels = 4096
      const padding = 110
      const offset4cs2play = 0.375

      const rasterExtents: Extent[] = []
      const vectorExtents: Extent[] = []

      const resScale = resolution / settings.resolution
      const smoothRadius = settings.smoothRadius * resScale
      const sharpenRadius = settings.sharpenRadius * resScale

      const _mapPixels = resolution - mapSpec[settings.gridInfo].correction
      const unitSize = settings.size / _mapPixels
      const tmpMapPixels = Math.ceil((_mapPixels + padding * 2) / 4) * 4
      const tmpMapSize = tmpMapPixels * unitSize

      const result: ResultType = {
        heightmap: new Float32Array(),
        worldMap: new Float32Array(),
        waterMapImage: undefined,
        waterWayMapImage: undefined,
        min: 0,
        max: 0,
      }

      // calculate extent
      if (mode !== 'preview' && settings.gridInfo === 'cs2') {
        // worldMap
        rasterExtents.push(this.getExtent(settings, tmpMapSize, 0, rasterPixels))
        vectorExtents.push(this.getExtent(settings, tmpMapSize, 0, vectorPixels))
        // heightmap
        rasterExtents.push(this.getExtent(settings, tmpMapSize, offset4cs2play, rasterPixels))
        vectorExtents.push(this.getExtent(settings, tmpMapSize, offset4cs2play, vectorPixels))

        const option: MultiMapOption = {
          settings,
          rasterExtents: rasterExtents,
          vectorExtents: vectorExtents,
          mapPixels: tmpMapPixels,
          unitSize,
          smoothRadius,
          sharpenRadius,
          isDebug: isDebug!,
        }

        const data = await this.generateCS2Map(option)

        function asyncExtractArray(array: Float32Array, startX: number, startY: number, cropSize: number): Promise<Float32Array> {
          return new Promise((resolve) => {
            const result = extractArray(array, startX, startY, cropSize)
            resolve(result)
          })
        }

        const [heightmapData, tmpWorldMapData] = await Promise.all([
          asyncExtractArray(data.heightmap, 6244, 6244, 4096),
          asyncExtractArray(data.heightmap, 100, 100, 16384),
        ])

        const wordMapData = new Float32Array(16777216)

        for (let y = 0; y < 4096; y++) {
          for (let x = 0; x < 4096; x++) {
            const index = (y * 4) * 16384 + (x * 4)
            wordMapData[y * 4096 + x] = (
              tmpWorldMapData[index + 16385]
              + tmpWorldMapData[index + 16386]
              + tmpWorldMapData[index + 32769]
              + tmpWorldMapData[index + 32770]
            ) / 4
          }
        }

        function asyncGetMinMaxHeight(map: Float32Array, padding: number): Promise<{ min: number, max: number }> {
          return new Promise((resolve) => {
            const result = getMinMaxHeight(map, padding)
            resolve(result)
          })
        }

        const [{ min: h_min, max: h_max }, { min: w_min, max: w_max }] = await Promise.all([
          asyncGetMinMaxHeight(heightmapData, 0),
          asyncGetMinMaxHeight(wordMapData, 0),
        ])

        Object.assign(result, {
          heightmap: heightmapData,
          worldMap: wordMapData,
          waterMapImage: data.waterMapImage,
          waterWayMapImage: data.waterWayMapImage,
          min: Math.min(h_min, w_min),
          max: Math.max(h_max, w_max),
        })
      } else {
        rasterExtents.push(this.getExtent(settings, tmpMapSize, 0, rasterPixels))
        vectorExtents.push(this.getExtent(settings, tmpMapSize, 0, vectorPixels))

        const option: SingleMapOption = {
          settings,
          rasterExtent: rasterExtents[0],
          vectorExtent: vectorExtents[0],
          mapPixels: tmpMapPixels,
          unitSize,
          smoothRadius,
          sharpenRadius,
          isDebug: isDebug!,
        }

        const data = resolution > 8192
          ? await this.generateMultiMap(option)
          : await this.generateSingleMap(option)

        const extractData = extractArray(data.heightmap, 100, 100, resolution)

        Object.assign(result, {
          heightmap: extractData,
          waterMapImage: data.waterMapImage,
          waterWayMapImage: data.waterWayMapImage,
          min: data.min,
          max: data.max,
        })
      }

      // output png
      if (mode === 'png') {
        await initPng()

        if (settings.gridInfo === 'cs2') {
          const h_png = await this.encode(mode, result, settings, resolution)
          const w_png = await this.encode(mode, result, settings, resolution, 'worldMap')

          this.progressCallback!({ type: 'phase', data: `Completed` })

          return {
            heightmap: h_png.data as Blob,
            worldMap: w_png.data as Blob,
          }
        } else {
          const png = await this.encode(mode, result, settings, resolution)

          this.progressCallback!({ type: 'phase', data: `Completed` })

          return { heightmap: png.data as Blob }
        }
      }

      // output raw
      if (mode === 'raw') {
        if (settings.gridInfo === 'cs2') {
          const h_raw: Uint8Array = await this.encode(mode, result, settings, resolution)
          const w_raw: Uint8Array = await this.encode(mode, result, settings, resolution, 'worldMap')

          this.progressCallback!({ type: 'phase', data: `Completed` })

          return Comlink.transfer(
            {
              heightmap: h_raw,
              worldMap: w_raw,
            },
            [w_raw.buffer, h_raw.buffer],
          )
        } else {
          const h_raw: Uint8Array = await this.encode(mode, result, settings, resolution)

          this.progressCallback!({ type: 'phase', data: `Completed` })

          return Comlink.transfer(
            { heightmap: h_raw },
            [h_raw.buffer],
          )
        }
      }

      // preview
      const transferables: (ArrayBufferLike | ImageBitmap)[] = [result.heightmap.buffer]

      if (result.waterMapImage) {
        transferables.push(result.waterMapImage)
      }

      if (result.waterWayMapImage) {
        transferables.push(result.waterWayMapImage)
      }

      this.progressCallback!({ type: 'phase', data: `Completed` })

      return Comlink.transfer(
        {
          heightmap: result.heightmap,
          worldMap: result.worldMap,
          waterMapImage: result.waterMapImage,
          waterWayMapImage: result.waterWayMapImage,
          min: result.min,
          max: result.max,
        },
        transferables,
      )
    } catch (error: any) {
      throw new Error(`GetCitiesMapWorker: ${error.message}`)
    }
  }
}

Comlink.expose(new GetCitiesMapWorker())
export type GetCitiesMapWorkerType = InstanceType<typeof GetCitiesMapWorker>
