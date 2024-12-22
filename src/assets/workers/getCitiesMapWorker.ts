import * as Comlink from 'comlink'
import type { SingleMapOption, MultiMapOption, Settings, Extent, ProgressData, ResultType, FileType } from '~/types/types'
import type { MapProcessWorkerType } from '~/assets/workers/mapProcessWorker'
import { mapSpec } from '~/utils/const'
import { getMinMaxHeight } from '~/utils/elevation'
import { mergeTiles, scaleDownWorldMap } from '~/utils/tileProcess'
import { getExtentInWorldCoords, rotateExtent } from '~/utils/getExtent'
import initPng, { encode_png } from '~~/wasm/png_lib/pkg'
import { WorkerPool } from '~/utils/workerPool'
import MapProcessWorker from '~/assets/workers/mapProcessWorker.ts?worker'

type SubWorker = {
  remote: Comlink.Remote<MapProcessWorkerType>
  worker: Worker
}

class GetCitiesMapWorker {
  private progressCallback: ((data: ProgressData) => void) | undefined
  private workerPool: WorkerPool<SubWorker> | undefined
  private resolution: number = 0

  public setCallback(progressCallback: (data: ProgressData) => void) {
    this.progressCallback = progressCallback
  }

  private validateCallback() {
    if (!this.progressCallback) {
      throw new Error('MapProcessWorker: Setting a callback function is required.')
    }
  }

  private validateArrayElements(array: any[], errorMessage: string) {
    for (let i = 0; i < array.length; i++) {
      if (!array[i]) throw new Error(errorMessage)
    }
  }

  private async setSubWorker(workerCount = navigator.hardwareConcurrency || 4) {
    if (this.workerPool) {
      await this.releaseWorkerPool()
    }

    const subWorkers: SubWorker[] = []
    this.workerPool = undefined

    try {
      const initPromises = Array.from({ length: workerCount }, async (_, i) => {
        const worker = new MapProcessWorker()
        const remote = Comlink.wrap<MapProcessWorkerType>(worker)

        await remote.initialize(i, Comlink.proxy(this.progressCallback!))

        subWorkers.push({ remote, worker })
      })

      await Promise.all(initPromises)

      this.workerPool = new WorkerPool(subWorkers)

      if (!this.workerPool) {
        throw new Error('MapProcessWorker: Failed to create worker pool.')
      }
    } catch (error: any) {
      console.error('Error during worker initialization:', error)

      await Promise.all(subWorkers.map(({ remote, worker }) => {
        remote[Comlink.releaseProxy]()
        worker.terminate()
      }))

      this.workerPool = undefined

      throw new Error(`MapProcessWorker: Failed to create worker pool. ${error.message}`)
    }
  }

  private async replaceWorker(oldWorker: SubWorker) {
    const index = await oldWorker.remote.getIndex()
    // delete used workers
    oldWorker.remote[Comlink.releaseProxy]()
    oldWorker.worker.terminate()
    // create a new worker
    const newWorker = new MapProcessWorker()
    const newRemote = Comlink.wrap<MapProcessWorkerType>(newWorker)

    await newRemote.initialize(index ?? 0, Comlink.proxy(this.progressCallback!))

    this.workerPool?.addWorker({ remote: newRemote, worker: newWorker })
  }

  private async releaseWorkerPool() {
    const list = this.workerPool?.getQueueList()

    if (list) {
      await Promise.all(
        list.map(({ remote, worker }) => {
          remote[Comlink.releaseProxy]()
          worker.terminate()
        }),
      )
    }
    this.workerPool = undefined
  }

  private getExtent(settings: Settings, size: number, offset: number, pixelsPerTile: number) {
    const extentData = getExtentInWorldCoords(settings.lng, settings.lat, size, offset, pixelsPerTile)
    const extent = settings.angle === 0 ? extentData : rotateExtent(extentData, settings.angle, extentData.centerX, extentData.centerY)
    return extent
  }

  private getDivisionCount(resolution: number) {
    return Math.min(Math.ceil(resolution / 4000), 4)
  }

  private async generateSingleMap(option: SingleMapOption): Promise<ResultType> {
    const subWWorker = await this.workerPool?.getWorker()
    const data = await subWWorker?.remote.getMapData(option)

    const heightmaps = [data?.heightmap, data?.waterMap, data?.waterWayMap]

    this.validateArrayElements(heightmaps, 'generateSingleMap: Error when getting heightmap data')

    const tileMaps: (Float32Array[] | undefined)[] = option.division > 0
      ? await Promise.all(
        heightmaps.map(async (map) => {
          const subWWorker = await this.workerPool?.getWorker()
          if (!subWWorker || !map) return undefined
          const tileMap = await subWWorker.remote.splitTile(Comlink.transfer(map, [map.buffer]), option.division, 100)
          this.workerPool?.releaseWorker(subWWorker)
          return tileMap
        }),
      )
      : [[data!.heightmap], [data!.waterMap], [data!.waterWayMap]]

    this.validateArrayElements(tileMaps, 'generateSingleMap: Error when split tiles')

    const { rasterExtent, vectorExtent, ...mapOption } = option

    const combinedMaps = await Promise.all(
      tileMaps[0]!.map(async (map, index) => {
        const subWorker = await this.workerPool?.getWorker()
        if (!subWorker || !map) return undefined

        const tileMap = await subWorker.remote.applyEffects(Comlink.transfer(map!, [map!.buffer]), mapOption)
        const noiseMap = tileMap!.noiseMap ? Comlink.transfer(tileMap!.noiseMap, [tileMap!.noiseMap!.buffer]) : undefined
        const combinedMap = await subWorker.remote.combineMap(
          Comlink.transfer(tileMap!.effectedMap, [tileMap!.effectedMap.buffer]),
          noiseMap,
          Comlink.transfer(tileMaps[1]![index], [tileMaps[1]![index].buffer]),
          Comlink.transfer(tileMaps[2]![index], [tileMaps[2]![index].buffer]),
          mapOption,
          true,
        )

        await this.replaceWorker(subWorker)

        return combinedMap
      }),
    )

    for (let i = 0; i < combinedMaps.length; i++) {
      if (!combinedMaps[i]?.result) throw new Error('generateSingleMap: Error when combine maps')
    }

    const resultMapData = option.division > 0
      ? (() => {
          this.progressCallback!({ type: 'phase', data: 'Merging map tiles' })

          const results: Float32Array[] = combinedMaps.map(item => item!.result)

          const mergedMap = mergeTiles(results, option.mapPixels - 20 + mapSpec[option.settings.gridInfo].correction, 100)
          const min = Math.min(...combinedMaps.map(item => item!.min))
          const max = Math.max(...combinedMaps.map(item => item!.max))

          return {
            heightmap: mergedMap!,
            min,
            max,
          }
        })()
      : {
          heightmap: combinedMaps[0]!.result!,
          min: combinedMaps[0]!.min,
          max: combinedMaps[0]!.max,
        }

    const resultHeightmap = await subWWorker!.remote.extractMap(
      Comlink.transfer(resultMapData.heightmap, [resultMapData.heightmap.buffer]),
      100,
      100,
      this.resolution,
    )

    this.workerPool?.releaseWorker(subWWorker!)

    return {
      heightmap: resultHeightmap!,
      waterMapImage: data?.waterMapImage,
      waterWayMapImage: data?.waterWayMapImage,
      min: resultMapData.min,
      max: resultMapData.max,
    }
  }

  private async generateCS2Map(option: MultiMapOption): Promise<ResultType> {
    const singleMapOptions: SingleMapOption[] = []
    const unitSizes = [option.unitSize, option.unitSize / 4]

    for (let i = 0; i < option.rasterExtents.length; i++) {
      singleMapOptions.push({
        settings: option.settings,
        mapPixels: option.mapPixels,  // resolution compatible with split processing
        unitSize: unitSizes[i],
        smoothRadius: option.smoothRadius,
        sharpenRadius: option.sharpenRadius,
        division: option.division,
        isDebug: option.isDebug,
        rasterExtent: option.rasterExtents[i],
        vectorExtent: option.vectorExtents[i],
      })
    }

    const division = option.division

    const worker1 = await this.workerPool?.getWorker()
    const worker2 = await this.workerPool?.getWorker()

    const [worldMapData, heightmapData] = await Promise.all([
      worker1!.remote.getMapData(singleMapOptions[0]),   // the generated size is a multiple of 12 plus 200px
      worker2!.remote.getMapData(singleMapOptions[1]),
    ])

    const worldMaps = [worldMapData?.heightmap, worldMapData?.waterMap, worldMapData?.waterWayMap]
    const heightmaps = [heightmapData?.heightmap, heightmapData?.waterMap, heightmapData?.waterWayMap]

    this.validateArrayElements(worldMaps, 'generateCS2Map: Error when getting world map data')
    this.validateArrayElements(heightmaps, 'generateCS2Map: Error when getting heightmap data')

    const tmpMaps = await Promise.all(
      worldMaps.map(async (map, index) => {
        const subWorker = await this.workerPool?.getWorker()
        if (!subWorker || !map) return undefined

        const scaleUpedWorldMap = await subWorker.remote.scaleUpBicubic(Comlink.transfer(map, [map.buffer]))
        const blendedMap = await subWorker.remote.blendMapsWithFeathering(
          Comlink.transfer(scaleUpedWorldMap!, [scaleUpedWorldMap!.buffer]),
          Comlink.transfer(heightmaps[index]!, [heightmaps[index]!.buffer]),
          100,
        )

        this.workerPool?.releaseWorker(subWorker)
        return blendedMap
      }),
    )

    this.validateArrayElements(tmpMaps, 'generateCS2Map: Error when processing tiles')

    const tileMaps = await Promise.all(
      tmpMaps.map(async (map) => {
        const subWorker = await this.workerPool?.getWorker()
        if (!subWorker || !map) return undefined
        const tileMap = await subWorker.remote.splitTile(Comlink.transfer(map, [map.buffer]), division, 100)
        this.workerPool?.releaseWorker(subWorker)
        return tileMap
      }),
    )

    this.validateArrayElements(tileMaps, 'generateCS2Map: Error when split tiles')

    const { rasterExtents, vectorExtents, ...mapOption } = option

    const combinedMaps = await Promise.all(
      tileMaps[0]!.map(async (map, index) => {
        const subWorker = await this.workerPool?.getWorker()
        if (!subWorker || !map) return undefined

        const tileMap = await subWorker.remote.applyEffects(Comlink.transfer(map!, [map!.buffer]), mapOption)
        const noiseMap = tileMap!.noiseMap ? Comlink.transfer(tileMap!.noiseMap, [tileMap!.noiseMap!.buffer]) : undefined
        const combinedMap = await subWorker.remote.combineMap(
          Comlink.transfer(tileMap!.effectedMap, [tileMap!.effectedMap.buffer]),
          noiseMap,
          Comlink.transfer(tileMaps[1]![index], [tileMaps[1]![index].buffer]),
          Comlink.transfer(tileMaps[2]![index], [tileMaps[2]![index].buffer]),
          mapOption,
          false,
        )

        this.replaceWorker(subWorker)

        return combinedMap
      }),
    )

    for (let i = 0; i < combinedMaps.length; i++) {
      if (!combinedMaps[i]?.result) throw new Error('generateCS2Map: Error when combine maps')
    }

    this.progressCallback!({ type: 'phase', data: 'Merging map tiles' })

    const results: Float32Array[] = combinedMaps.map(item => item!.result)

    const mergedMap = mergeTiles(results, 16584, 100)
    const mergedMaps = [mergedMap, new Float32Array(mergedMap)]

    const [resultHeightmap, tmpWorldMap] = await Promise.all([
      worker1?.remote.extractMap(Comlink.transfer(mergedMaps[0], [mergedMaps[0].buffer]), 6244, 6244, 4096),
      worker2?.remote.extractMap(Comlink.transfer(mergedMaps[1], [mergedMaps[1].buffer]), 100, 100, 16384),
    ])

    this.workerPool?.releaseWorker(worker1!)
    this.workerPool?.releaseWorker(worker2!)

    const resultWorldMap = scaleDownWorldMap(tmpWorldMap!)

    const [h_minmax, w_minmax] = await Promise.all([
      getMinMaxHeight(resultHeightmap!),
      getMinMaxHeight(resultWorldMap),
    ])

    return {
      heightmap: resultHeightmap!,
      worldMap: resultWorldMap,
      waterMapImage: worldMapData?.waterMapImage,
      waterWayMapImage: worldMapData?.waterWayMapImage,
      min: Math.min(h_minmax.min, w_minmax.min),
      max: Math.max(h_minmax.max, w_minmax.max),
    }
  }

  private async encode(mode: 'raw' | 'png', data: ResultType, settings: Settings, resolution: number, map: 'heightmap' | 'worldMap' = 'heightmap') {
    const base = settings.adjToMin ? data.min : settings.baseLevel
    const elevationRange = data.max - base
    const unitScale = settings.elevationScale / 65535

    let scaleFactor: number
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
      this.progressCallback!({ type: 'phase', data: 'Encoding to PNG data' })

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
    this.validateCallback()
    await this.setSubWorker()

    try {
      this.resolution = resolution
      const rasterPixels = 512
      const vectorPixels = 4096
      const padding = 110           // considering edges, it is set larger than 100
      const offset4cs2play = 0.375

      const rasterExtents: Extent[] = []
      const vectorExtents: Extent[] = []

      const resScale = resolution / settings.resolution
      const smoothRadius = settings.smoothRadius * resScale / ((mode === 'preview' && settings.gridInfo === 'cs2') ? 4 : 1)
      const sharpenRadius = settings.sharpenRadius * resScale / ((mode === 'preview' && settings.gridInfo === 'cs2') ? 4 : 1)

      const _mapPixels = resolution - mapSpec[settings.gridInfo].correction
      const unitSize = settings.size / _mapPixels
      const tmpMapPixels = _mapPixels + padding * 2
      const tmpMapSize = tmpMapPixels * unitSize

      const result = (mode !== 'preview' && settings.gridInfo === 'cs2')
        ? await (async () => {
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
            division: 4,
            isDebug: isDebug!,
          }

          return await this.generateCS2Map(option)
        })()
        : await (async () => {
          rasterExtents.push(this.getExtent(settings, tmpMapSize, 0, rasterPixels))
          vectorExtents.push(this.getExtent(settings, tmpMapSize, 0, vectorPixels))

          const division = this.getDivisionCount(resolution)

          const option: SingleMapOption = {
            settings,
            rasterExtent: rasterExtents[0],
            vectorExtent: vectorExtents[0],
            mapPixels: tmpMapPixels,
            unitSize,
            smoothRadius,
            sharpenRadius,
            division,
            isDebug: isDebug!,
          }

          return await this.generateSingleMap(option)
        })()

      await this.releaseWorkerPool()

      // output png
      if (mode === 'png') {
        await initPng()

        if (settings.gridInfo === 'cs2') {
          const pngs: any[] = await Promise.all([
            this.encode(mode, result, settings, resolution),
            this.encode(mode, result, settings, resolution, 'worldMap'),
          ])

          this.progressCallback!({ type: 'phase', data: `Completed` })

          return {
            heightmap: pngs[0].data as Blob,
            worldMap: pngs[1].data as Blob,
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
          const raws: Uint8Array[] = await Promise.all([
            this.encode(mode, result, settings, resolution),
            this.encode(mode, result, settings, resolution, 'worldMap'),
          ])

          this.progressCallback!({ type: 'phase', data: `Completed` })

          return Comlink.transfer(
            {
              heightmap: raws[0],
              worldMap: raws[1],
            },
            [raws[0].buffer, raws[1].buffer],
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
          waterMapImage: result.waterMapImage,
          waterWayMapImage: result.waterWayMapImage,
          min: result.min,
          max: result.max,
        },
        transferables,
      )
    } catch (error: any) {
      this.progressCallback!({ type: 'phase', data: 'Failed to generate map data' })
      throw new Error(`GetCitiesMapWorker: ${error.message}`)
    } finally {
      if (this.workerPool) {
        await this.releaseWorkerPool()
      }
    }
  }
}

Comlink.expose(new GetCitiesMapWorker())
export type GetCitiesMapWorkerType = InstanceType<typeof GetCitiesMapWorker>
