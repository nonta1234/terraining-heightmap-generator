import * as Comlink from 'comlink'
import type { SingleMapOption, Settings, Extent, ProgressData, ResultType } from '~/types/types'
import { mapSpec } from '~/utils/const'
import { mergeTiles, extractArray, splitTile } from '~/utils/elevation'
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

  private generateCs2Map() {
  }

  private async generateSingleMap(option: SingleMapOption): Promise<ResultType> {
    if (this.subWorkers.length < 1) {
      await this.setSubWorker(1)
    }

    await this.subWorkers[0].generateMap(option)
    this.progressCallback!({ type: 'phase', data: `Processing effects` })
    await this.subWorkers[0].applyEffects(option)
    this.progressCallback!({ type: 'phase', data: `Combining map data` })
    const result = await this.subWorkers[0].combine(option)
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

    const setMapData = async (worker: Comlink.Remote<GetSingleMapDataWorkerType>, heightmap: Float32Array, waterMap: Float32Array, waterWayMap: Float32Array) => {
      await worker.setMapData(
        Comlink.transfer(heightmap, [heightmap.buffer]),
        Comlink.transfer(waterMap, [waterMap.buffer]),
        Comlink.transfer(waterWayMap, [waterWayMap.buffer]),
      )
    }

    await Promise.all([
      setMapData(this.subWorkers[0], h_topleft, w_topleft, ww_topleft),
      setMapData(this.subWorkers[1], h_topright, w_topright, ww_topright),
      setMapData(this.subWorkers[2], h_bottomleft, w_bottomleft, ww_bottomleft),
      setMapData(this.subWorkers[3], h_bottomright, w_bottomright, ww_bottomright),
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
      const result = await this.subWorkers[index].combine(option)
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

  public async generateMap(mode: 'preview' | 'download', settings: Settings, resolution: number, isDebug: boolean): Promise<Blob | ResultType> {
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
      const tmpMapPixels = _mapPixels + padding * 2
      const tmpMapSize = tmpMapPixels * unitSize

      const result: ResultType = {
        heightmap: new Float32Array(),
        waterMapImage: undefined,
        waterWayMapImage: undefined,
        min: 0,
        max: 0,
      }

      // calculate extent
      if (mode === 'download' && settings.gridInfo === 'cs2') {
        // world
        rasterExtents.push(this.getExtent(settings, tmpMapSize, 0, rasterPixels))
        vectorExtents.push(this.getExtent(settings, tmpMapSize, 0, vectorPixels))
        // heightmap
        rasterExtents.push(this.getExtent(settings, tmpMapSize, offset4cs2play, rasterPixels))
        vectorExtents.push(this.getExtent(settings, tmpMapSize, offset4cs2play, vectorPixels))
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

      if (mode === 'download') {
        const base = settings.adjToMin ? result.min : settings.baseLevel
        const elevationRange = result.max - result.min
        const unitScale = settings.elevationScale / 65535

        let scaleFactor = 1
        if (settings.type === 'limit') {
          scaleFactor = elevationRange * settings.vertScale > settings.elevationScale ? settings.elevationScale / elevationRange : settings.vertScale
        } else if (settings.type === 'maximize') {
          scaleFactor = settings.elevationScale / elevationRange
        } else {
          scaleFactor = settings.vertScale
        }

        const resultHeightmap = result.heightmap.map(value => ((value - base) * scaleFactor) / unitScale)

        await initPng()

        const clampedArrayMap = new Uint8ClampedArray(resolution * resolution * 2)

        for (let i = 0; i < resultHeightmap.length; i++) {
          const h = Math.max(Math.round(resultHeightmap[i]), 0)
          clampedArrayMap[i * 2] = h >> 8
          clampedArrayMap[i * 2 + 1] = h & 255
        }

        const resultMap = new Uint8Array(clampedArrayMap)

        this.progressCallback({ type: 'phase', data: `Decoding data` })

        const png = await encode_png(
          { data: resultMap },
          settings.resolution,
          settings.resolution,
          'Grayscale',
          'Sixteen',
          'Default',
        )

        this.progressCallback({ type: 'phase', data: `Completed` })

        return Comlink.transfer(
          png.data as Blob,
          [png.data.arrayBuffer],
        )
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
