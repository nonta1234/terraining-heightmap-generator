import * as Comlink from 'comlink'
import type { SingleMapOption, MultiMapOption, Settings, Extent, ProgressData, ResultType, FileType } from '~/types/types'
import type { MapProcessWorkerType } from '~/assets/workers/mapProcessWorker'
import type { ProcessFunctions } from '~/processes'
import { processes } from '~/processes'
import { getTileData } from '~/processes/getTileData'
import { blendMapsWithFeathering } from '~/processes/blendMapsWithFeathering'
import { scaleUpBicubic } from '~/processes/scaleUpBicubic'
import { mapSpec, PIXELS_PER_TILE, PIXELS_PER_VECTOR_TILE } from '~/utils/const'
import { getMinMaxHeight } from '~/utils/elevation'
import { getExtentInWorldCoords, rotateExtent } from '~/utils/getExtent'
import initPng, { encode_png } from '~~/wasm/png_lib/pkg'
import { WorkerPool } from '~/utils/workerPool'
import MapProcessWorker from '~/assets/workers/mapProcessWorker.ts?worker'
// import { blendMapsWithFeathering } from '~/processes/blendMapsWithFeathering'

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

  public async generateMap(
    mode: 'preview' | 'raw' | 'png',
    settings: Settings,
    resolution: number,
    isDebug: boolean,
  ): Promise<FileType | ResultType> {
    this.validateCallback()
    await this.setSubWorker()

    try {
      this.resolution = resolution
      const padding = 110           // considering edges, it is set larger than 100
      const offset4cs2play = 0.375

      const rasterExtents: Extent[] = []
      const vectorExtents: Extent[] = []
      const oceanExtents: Extent[] = []

      const resoScale = resolution / settings.resolution
      const smoothRadius = settings.smoothRadius * resoScale / ((mode === 'preview' && settings.gridInfo === 'cs2') ? 4 : 1)
      const sharpenRadius = settings.sharpenRadius * resoScale / ((mode === 'preview' && settings.gridInfo === 'cs2') ? 4 : 1)

      const mapCells = resolution - mapSpec[settings.gridInfo].correction   // correction = 0: DEM Type, correction = 1: Mesh Type
      const unitSize = settings.size / mapCells
      const tmpMapPixels = mapCells + padding * 2
      const tmpMapSize = tmpMapPixels * unitSize

      const subdivision = (mode === 'preview' && settings.subdivisionPreview) || (mode !== 'preview' && settings.subdivisionDownload)

      const getAutoSubdivisionCount = (offset: number, baseZoom: number): number => {
        const extent = this.getExtent(settings, tmpMapSize, offset, PIXELS_PER_TILE)
        const side = this.getSideLength(extent)
        const zoom = Math.ceil(Math.log2(tmpMapPixels / side)) + Math.log2(settings.oversampling)
        return Math.min(3, Math.max(0, zoom - baseZoom))
      }

      const rasterCount = (subdivision && settings.subdivisionCount === 0)
        ? getAutoSubdivisionCount(0, 14)
        : settings.subdivisionCount

      const playCount = (subdivision && settings.subdivisionCount === 0 && mode !== 'preview' && settings.gridInfo === 'cs2')
        ? getAutoSubdivisionCount(offset4cs2play, 14)
        : settings.subdivisionCount

      const rasterPixels = subdivision ? PIXELS_PER_TILE * (2 ** rasterCount) : PIXELS_PER_TILE
      const playRasterPixels = subdivision ? PIXELS_PER_TILE * (2 ** playCount) : PIXELS_PER_TILE

      const oceanCount = settings.useBathymetry ? getAutoSubdivisionCount(0, 7) : 0

      const playOceanCount = settings.useBathymetry && mode !== 'preview' && settings.gridInfo === 'cs2'
        ? getAutoSubdivisionCount(offset4cs2play, 7)
        : 0

      const oceanPixels = settings.useBathymetry ? PIXELS_PER_TILE * (2 ** oceanCount) : PIXELS_PER_TILE
      const playOceanPixels = settings.useBathymetry ? PIXELS_PER_TILE * (2 ** playOceanCount) : PIXELS_PER_TILE

      const result = (mode !== 'preview' && settings.gridInfo === 'cs2')
        ? await (async () => {
          // worldMap
          rasterExtents.push(this.getExtent(settings, tmpMapSize, 0, rasterPixels))
          vectorExtents.push(this.getExtent(settings, tmpMapSize, 0, PIXELS_PER_VECTOR_TILE))
          // heightmap
          rasterExtents.push(this.getExtent(settings, tmpMapSize, offset4cs2play, playRasterPixels))
          vectorExtents.push(this.getExtent(settings, tmpMapSize, offset4cs2play, PIXELS_PER_VECTOR_TILE))

          if (settings.useBathymetry) {
            oceanExtents.push(this.getExtent(settings, tmpMapSize, 0, oceanPixels))
            oceanExtents.push(this.getExtent(settings, tmpMapSize, offset4cs2play, playOceanPixels))
          }

          const option: MultiMapOption = {
            settings,
            rasterExtents,
            vectorExtents,
            oceanExtents,
            mapPixels: tmpMapPixels,
            rasterPixels,
            oceanPixels,
            playRasterPixels,
            playOceanPixels,
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
          vectorExtents.push(this.getExtent(settings, tmpMapSize, 0, PIXELS_PER_VECTOR_TILE))

          if (settings.useBathymetry) {
            oceanExtents.push(this.getExtent(settings, tmpMapSize, 0, oceanPixels))
          }

          const division = this.getDivisionCount(resolution)

          const option: SingleMapOption = {
            settings,
            rasterExtent: rasterExtents[0],
            vectorExtent: vectorExtents[0],
            oceanExtent: oceanExtents[0],
            mapPixels: tmpMapPixels,
            rasterPixels,
            oceanPixels,
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
      throw new Error(`GetCitiesMapWorker: ${error.message}: ${error.stack}`)
    } finally {
      if (this.workerPool) {
        await this.releaseWorkerPool()
      }
    }
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

  /*
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
  */

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

  private autoTransfer<T>(value: T): T {
    if (value instanceof ArrayBuffer) {
      return Comlink.transfer(value, [value]) as T
    }
    if (value && typeof value === 'object' && 'buffer' in value && value.buffer instanceof ArrayBuffer) {
      return Comlink.transfer(value, [value.buffer]) as T
    }
    return value
  }

  private async runTask<T extends keyof ProcessFunctions>(
    key: T,
    ...args: Parameters<ProcessFunctions[T]>
  ): Promise<ReturnType<ProcessFunctions[T]>> {
    const processFn = processes[key]
    const wrappedArgs = args.map(arg => this.autoTransfer(arg))

    return this.workerPool!.executeTask(worker =>
      worker.remote.executeProcess(Comlink.proxy(processFn), ...wrappedArgs),
    ) as Promise<ReturnType<ProcessFunctions[T]>>
  }

  private getExtent(settings: Settings, size: number, offset: number, pixelsPerTile: number) {
    const extentData = getExtentInWorldCoords(settings.lng, settings.lat, size, offset, pixelsPerTile)
    const extent = settings.angle === 0
      ? extentData
      : rotateExtent(extentData, settings.angle, extentData.centerX, extentData.centerY)
    return extent
  }

  private getDivisionCount(resolution: number) {
    return Math.min(Math.ceil(resolution / 4000), 4)
  }

  private getSideLength(extent: Extent) {
    const dx = extent.topright.x - extent.bottomleft.x
    const dy = extent.topright.y - extent.bottomleft.y
    return Math.sqrt(dx * dx + dy * dy) / Math.SQRT2
  }

  private async generateSingleMap(option: SingleMapOption): Promise<ResultType> {
    const data = await getTileData(option, this.progressCallback!)
    const heightmaps = [data?.heightmap, data?.waterMap, data?.waterWayMap, data?.waterDepthMap]

    this.validateArrayElements(heightmaps, 'generateSingleMap: Error when getting heightmap data')

    const tileMaps: (Float32Array[] | undefined)[] = option.division > 1
      ? await Promise.all(
        heightmaps.map(async (map, index) => {
          this.progressCallback!({ type: 'phase', data: `Splitting map tile for segmentation. (#${index})` })
          return await this.runTask('splitTile', map!, option.division, 100)
        }),
      )
      : [[data!.heightmap], [data!.waterMap], [data!.waterWayMap], [data!.waterDepthMap]]

    this.validateArrayElements(tileMaps, 'generateSingleMap: Error when split tiles')

    const { rasterExtent, vectorExtent, oceanExtent, ...mapOption } = option

    const combinedMaps = await Promise.all(
      tileMaps[0]!.map(async (map, index) => {
        this.progressCallback!({ type: 'phase', data: `Processing effects (#${index})` })
        const tileMap = await this.runTask('applyEffects', map!, mapOption)

        this.progressCallback!({ type: 'phase', data: `Combining map data (#${index})` })
        const combinedMap = await this.runTask('combineMap',
          tileMap!.effectedMap,
          tileMap!.noiseMap ? tileMap!.noiseMap : undefined,
          tileMaps[1]![index],
          tileMaps[2]![index],
          tileMaps[3]![index],
          mapOption,
          true,
        )

        return combinedMap
      }),
    )

    for (let i = 0; i < combinedMaps.length; i++) {
      if (!combinedMaps[i]?.result) throw new Error('generateSingleMap: Error when combine maps')
    }

    const resultMapData = option.division > 1
      ? await (async () => {
        this.progressCallback!({ type: 'phase', data: 'Merging map tiles' })

        const results: Float32Array[] = combinedMaps.map(item => item!.result)

        const px = option.mapPixels - 20 + mapSpec[option.settings.gridInfo].correction
        const size = px % 2 === 0 ? px : px + 1

        const mergedMap = await this.runTask('mergeTiles', results, size, 100)

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

    const resultHeightmap = await this.runTask('extractMap',
      resultMapData.heightmap,
      100,
      100,
      this.resolution,
    )

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
      const rasterPixels = i === 0 ? option.rasterPixels : option.playRasterPixels!
      const oceanPixels = i === 0 ? option.oceanPixels : option.playOceanPixels!

      singleMapOptions.push({
        settings: option.settings,
        mapPixels: option.mapPixels,  // resolution compatible with split processing
        rasterPixels: rasterPixels,
        oceanPixels: oceanPixels,
        unitSize: unitSizes[i],
        smoothRadius: option.smoothRadius,
        sharpenRadius: option.sharpenRadius,
        division: option.division,
        isDebug: option.isDebug,
        rasterExtent: option.rasterExtents[i],
        vectorExtent: option.vectorExtents[i],
        oceanExtent: option.oceanExtents[i],
      })
    }

    const division = option.division

    const [worldMapData, heightmapData] = await Promise.all([
      getTileData(singleMapOptions[0], this.progressCallback!),
      getTileData(singleMapOptions[1], this.progressCallback!),
    ])

    const worldMaps = [worldMapData?.heightmap, worldMapData?.waterMap, worldMapData?.waterWayMap, worldMapData?.waterDepthMap]
    const heightmaps = [heightmapData?.heightmap, heightmapData?.waterMap, heightmapData?.waterWayMap]

    this.validateArrayElements(worldMaps, 'generateCS2Map: Error when getting world map data')
    this.validateArrayElements(heightmaps, 'generateCS2Map: Error when getting heightmap data')

    /*
    const tmpMaps = await Promise.all(
      worldMaps.map(async (map, index) => {
        if (!map) return undefined
        const scaleUpedWorldMap = await this.runTask('scaleUpBicubic', map)

        const blendedMap = index !== 3
          ? blendMapsWithFeathering(scaleUpedWorldMap!, heightmaps[index]!, 100)
          // ? await this.runTask('blendMapsWithFeathering', scaleUpedWorldMap!, heightmaps[index]!, 100)
          : scaleUpedWorldMap!

        return blendedMap
      }),
    )
    */

    const tmpMaps = (await Promise.all(
      worldMaps.map(async (map, index) => {
        if (!map) return null
        try {
          const scaleUpedWorldMap = await this.runTask('scaleUpBicubic', map)
          const scaleUpedWorldMap0 = scaleUpedWorldMap!.slice(0, scaleUpedWorldMap!.length / 2)
          const scaleUpedWorldMap1 = scaleUpedWorldMap!.slice(scaleUpedWorldMap!.length / 2)

          const blendedMap = index !== 3
            ? await this.runTask('blendMapsWithFeathering', scaleUpedWorldMap0, scaleUpedWorldMap1, heightmaps[index]!, 100)
            : scaleUpedWorldMap!

          return blendedMap
        } catch (error) {
          console.error(`Error processing map ${index}:`, error)
          return null
        }
      }),
    )).filter(Boolean)

    this.validateArrayElements(tmpMaps, 'generateCS2Map: Error when processing tiles')

    const tileMaps = await Promise.all(
      tmpMaps.map(async (map) => {
        return await this.runTask('splitTile', map!, division, 100)
      }),
    )

    this.validateArrayElements(tileMaps, 'generateCS2Map: Error when split tiles')

    const { rasterExtents, vectorExtents, ...mapOption } = option

    const combinedMaps = await Promise.all(
      tileMaps[0]!.map(async (map, index) => {
        this.progressCallback!({ type: 'phase', data: `Processing effects (#${index})` })
        const tileMap = await this.runTask('applyEffects', map!, mapOption)

        this.progressCallback!({ type: 'phase', data: `Combining map data (#${index})` })
        const combinedMap = await this.runTask('combineMap',
          tileMap!.effectedMap,
          tileMap!.noiseMap ? tileMap!.noiseMap : undefined,
          tileMaps[1]![index],
          tileMaps[2]![index],
          tileMaps[3]![index],
          mapOption,
          false,
        )

        return combinedMap
      }),
    )

    for (let i = 0; i < combinedMaps.length; i++) {
      if (!combinedMaps[i]?.result) throw new Error('generateCS2Map: Error when combine maps')
    }

    this.progressCallback!({ type: 'phase', data: 'Merging map tiles' })

    const results: Float32Array[] = combinedMaps.map(item => item!.result)

    const mergedMap = await this.runTask('mergeTiles', results, 16584, 100)
    const mergedMap0 = mergedMap!.slice(0, mergedMap.length / 2)
    const mergedMap1 = mergedMap!.slice(mergedMap.length / 2)

    const [resultHeightmap, tmpWorldMap] = await Promise.all([
      this.runTask('extractMap', mergedMap, 6244, 6244, 4096),
      this.runTask('extractMapCS2', mergedMap0, mergedMap1, 100, 100, 16384),
    ])

    const tmpWorldMap0 = tmpWorldMap.slice(0, tmpWorldMap.length / 2)
    const tmpWorldMap1 = tmpWorldMap.slice(tmpWorldMap.length / 2)

    const resultWorldMap = await this.runTask('scaleDownWorldMap', tmpWorldMap0, tmpWorldMap1)

    const h_minmax = getMinMaxHeight(resultHeightmap!)
    const w_minmax = getMinMaxHeight(resultWorldMap)

    return {
      heightmap: resultHeightmap!,
      worldMap: resultWorldMap,
      waterMapImage: worldMapData?.waterMapImage,
      waterWayMapImage: worldMapData?.waterWayMapImage,
      min: Math.min(h_minmax.min, w_minmax.min),
      max: Math.max(h_minmax.max, w_minmax.max),
    }
  }

  private async encode(
    mode: 'raw' | 'png',
    data: ResultType,
    settings: Settings,
    resolution: number,
    map: 'heightmap' | 'worldMap' = 'heightmap',
  ) {
    const base = settings.adjToMin ? data.min : settings.baseLevel
    const elevationRange = data.max - base
    const unitScale = settings.elevationScale / 65535

    let scaleFactor: number
    if (settings.type === 'limit') {
      scaleFactor = elevationRange * settings.vertScale > settings.elevationScale
        ? settings.elevationScale / elevationRange
        : settings.vertScale
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
}

Comlink.expose(new GetCitiesMapWorker())
export type GetCitiesMapWorkerType = InstanceType<typeof GetCitiesMapWorker>
