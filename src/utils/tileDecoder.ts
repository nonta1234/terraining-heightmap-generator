import * as Comlink from 'comlink'
import type { TileDecoderWorkerType } from '~/assets/workers/tileDecoderWorker'
import type { Settings, MapType, ProgressData } from '~/types/types'
import type { FetchError } from 'ofetch'
import TileDecoderWorker from '~/assets/workers/tileDecoderWorker.ts?worker'
import { WorkerPool } from '~/utils/workerPool'

type T = {
  data: Blob | undefined
  error: FetchError<any> | undefined
}

export class TileDecoder {
  private workers: { remote: Comlink.Remote<TileDecoderWorkerType>, worker: Worker }[] = []
  private workerPool: WorkerPool<Comlink.Remote<TileDecoderWorkerType>>

  constructor(workerCount = navigator.hardwareConcurrency || 4) {
    const remotes: Comlink.Remote<TileDecoderWorkerType>[] = []
    for (let i = 0; i < workerCount; i++) {
      const worker = new TileDecoderWorker()
      const remote = Comlink.wrap<TileDecoderWorkerType>(worker)
      this.workers.push({ remote, worker })
      remotes.push(remote)
    }
    this.workerPool = new WorkerPool(remotes)
  }

  public async processTiles(
    tileList: PromiseSettledResult<T>[],
    settings: Settings,
    mapType: MapType,
    pixelsPerTile: number,
    tileCount: number,
    elevations: Float32Array,
    progressCallback: (data: ProgressData) => void,
  ) {
    const decodingPromises = tileList.map(async (tile, index) => {
      if (tile.status === 'fulfilled' && tile.value.data) {
        try {
          const blob = tile.value.data
          const arrBuffer = await blob.arrayBuffer()

          const worker = await this.workerPool.getWorker()
          const useMapbox = settings.useMapbox
          const elevs = await worker.decodeTile(Comlink.transfer(
            {
              arrBuffer,
              useMapbox,
              mapType,
            },
            [arrBuffer],
          ))

          const dy = Math.floor(index / tileCount) * pixelsPerTile
          const dx = (index % tileCount) * pixelsPerTile

          // copy decoded elevation data to the main elevation array
          for (let y = 0; y < pixelsPerTile; y++) {
            for (let x = 0; x < pixelsPerTile; x++) {
              elevations[(dy + y) * (tileCount * pixelsPerTile) + (dx + x)] = elevs[y * pixelsPerTile + x]
            }
          }

          this.workerPool.releaseWorker(worker)
          progressCallback({ type: 'progress' })
        } catch (error) {
          console.error(`Error processing tile at index #${index}:`, error)
          throw error
        }
      }
    })

    await Promise.all(decodingPromises)
    return elevations
  }

  public async terminate() {
    const terminationPromises = this.workers.map(async ({ remote, worker }) => {
      try {
        await remote.cleanup()
      } catch (error) {
        console.error('Error during decode worker cleanup:', error)
      } finally {
        remote[Comlink.releaseProxy]()
        worker.terminate()
      }
    })

    await Promise.all(terminationPromises)
    this.workers = []
  }
}
