import * as Comlink from 'comlink'
import type { ProgressData } from '~/types/types'

class MapProcessWorker {
  private index: number | undefined
  private progressCallback: ((data: ProgressData) => void) | undefined

  private isTransferable(value: any): boolean {
    return value instanceof ArrayBuffer
      || value instanceof ImageBitmap
      || value instanceof OffscreenCanvas
      || ArrayBuffer.isView(value)
  }

  public initialize(index: number, progressCallback: (data: ProgressData) => void) {
    this.index = index
    this.progressCallback = progressCallback
  }

  public getIndex() {
    return this.index
  }

  private async processWithTransfer<T>(fn: () => Promise<T>): Promise<T> {
    const result = await fn()
    const transferables: Transferable[] = []

    if (result instanceof Float32Array || result instanceof Uint8Array) {
      transferables.push(result.buffer)
    } else if (result instanceof ArrayBuffer || result instanceof ImageBitmap || result instanceof OffscreenCanvas) {
      transferables.push(result)
    } else if (typeof result === 'object' && result !== null) {
      for (const key in result) {
        if (this.isTransferable(result[key])) {
          if (result[key] instanceof Float32Array || result[key] instanceof Uint8Array) {
            transferables.push(result[key].buffer)
          } else {
            transferables.push(result[key] as Transferable)
          }
        }
      }
    }

    return transferables.length > 0 ? Comlink.transfer(result, transferables) : result
  }

  public async executeProcess<T extends (...args: any[]) => any>(
    processFn: Comlink.ProxyMarked & T,
    ...args: Parameters<T>
  ): Promise<ReturnType<T>> {
    return this.processWithTransfer(() => processFn(...args))
  }
}

Comlink.expose(new MapProcessWorker())
export type MapProcessWorkerType = InstanceType<typeof MapProcessWorker>
