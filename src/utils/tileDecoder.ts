import * as Comlink from 'comlink'
import type { TileDecoderWorkerType } from '~/assets/workers/tileDecoderWorker'
import TileDecoderWorker from '~/assets/workers/tileDecoderWorker.ts?worker'
import type { Settings, MapType } from '~/types/types'
import type { FetchError } from 'ofetch'

type T = {
  data: Blob | undefined
  error: FetchError<any> | undefined
}

export class TileDecoder {
  private workers: Comlink.Remote<TileDecoderWorkerType>[] = []
  private workerQueue: Comlink.Remote<TileDecoderWorkerType>[] = []
  private waitingCalls: ((worker: Comlink.Remote<TileDecoderWorkerType>) => void)[] = []

  constructor(workerCount = navigator.hardwareConcurrency || 4) {
    for (let i = 0; i < workerCount; i++) {
      const comlinkWorker = Comlink.wrap<TileDecoderWorkerType>(new TileDecoderWorker())
      this.workers.push(comlinkWorker)
      this.workerQueue.push(comlinkWorker)
    }
  }

  private getWorker(): Promise<Comlink.Remote<TileDecoderWorkerType>> {
    return new Promise((resolve) => {
      if (this.workerQueue.length > 0) {
        resolve(this.workerQueue.shift()!)
      } else {
        this.waitingCalls.push(resolve)
      }
    })
  }

  private releaseWorker(worker: Comlink.Remote<TileDecoderWorkerType>) {
    if (this.waitingCalls.length > 0) {
      const nextCall = this.waitingCalls.shift()!
      nextCall(worker)
    } else {
      this.workerQueue.push(worker)
    }
  }

  public async processTiles(
    tileList: PromiseSettledResult<T>[],
    settings: Settings,
    mapType: MapType,
    pixelsPerTile: number,
    tileCount: number,
    elevations: Float32Array,
    onProgress?: () => void,
  ) {
    const decodingPromises = tileList.map(async (tile, index) => {
      if (tile.status === 'fulfilled' && tile.value.data) {
        try {
          const blob = tile.value.data
          const arrBuffer = await blob.arrayBuffer()

          const worker = await this.getWorker()
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

          this.releaseWorker(worker)
          onProgress?.()
        } catch (error) {
          console.error(`Error processing tile at index ${index}:`, error)
          throw error
        }
      }
    })

    await Promise.all(decodingPromises)
    return elevations
  }

  public async terminate() {
    const terminationPromises = this.workers.map(async (worker) => {
      try {
        await worker.cleanup()
      } catch (error) {
        console.error('Error during worker cleanup:', error)
      } finally {
        worker[Comlink.releaseProxy]()
      }
    })

    await Promise.all(terminationPromises)
    this.workers = []
    this.workerQueue = []
    this.waitingCalls = []
  }
}
