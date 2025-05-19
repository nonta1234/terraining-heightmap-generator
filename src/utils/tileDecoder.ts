import * as Comlink from 'comlink'
import type { TileDecoderWorkerType } from '~/assets/workers/tileDecoderWorker'
import type { MapType } from '~/types/types'
import TileDecoderWorker from '~/assets/workers/tileDecoderWorker.ts?worker'
import { WorkerPool } from '~/utils/workerPool'

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

  public async decodeTile(
    arrBuffer: ArrayBuffer, useMapbox: boolean, mapType: MapType,
  ): Promise<Float32Array> {
    const worker = await this.workerPool.getWorker()

    try {
      const decodedElevationData = await worker.decodeTile(Comlink.transfer(
        { arrBuffer, useMapbox, mapType },
        [arrBuffer],
      ))
      return decodedElevationData
    } catch (error) {
      console.error('Error decoding tile:', error)
      throw error
    } finally {
      this.workerPool.releaseWorker(worker)
    }
  }

  public async subdivideTile(data: Float32Array, count: number, margin: number, enhance: number, damping: number): Promise<Float32Array> {
    const worker = await this.workerPool.getWorker()

    try {
      const subdividedElevationData = await worker.subdivideTile(
        Comlink.transfer(data, [data.buffer]), count, margin, enhance, damping,
      )

      return subdividedElevationData
    } catch (error) {
      console.error('Subdivision error:', error)
      throw error
    } finally {
      this.workerPool.releaseWorker(worker)
    }
  }

  public async terminate() {
    await Promise.all(this.workers.map(async ({ remote, worker }) => {
      try {
        await remote.cleanup()
      } catch (error) {
        console.error('Error during decode worker cleanup:', error)
      }
      remote[Comlink.releaseProxy]()
      worker.terminate()
    }))

    this.workers = []
  }
}
