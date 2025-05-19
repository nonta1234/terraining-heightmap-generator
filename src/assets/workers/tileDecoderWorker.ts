import * as Comlink from 'comlink'
import { decode as decode_webp } from '@jsquash/webp'
import initPng, { decode_png } from '~~/wasm/png_lib/pkg'
import type { MapType } from '~/types/types'
import { decodeElevation } from '~/utils/elevation'
import { subdivideTile } from '~/processes/subdivideTile'

type TileData = {
  arrBuffer: ArrayBuffer
  useMapbox: boolean
  mapType: MapType
}

class TileDecoderWorker {
  private wasmInitialized = false

  private async initializeWasm(useMapbox: boolean) {
    if (!this.wasmInitialized && useMapbox) {
      await initPng()
      this.wasmInitialized = true
    }
  }

  public async decodeTile({ arrBuffer, useMapbox, mapType }: TileData) {
    try {
      await this.initializeWasm(useMapbox)

      let byteArray: Uint8ClampedArray

      if (mapType === 'ocean' || !useMapbox) {
        const imgData = await decode_webp(arrBuffer)
        byteArray = new Uint8ClampedArray(imgData.data)
      } else {
        const arr = new Uint8Array(arrBuffer)
        const imgData = await decode_png({ data: arr })
        byteArray = new Uint8ClampedArray(imgData.data)
        imgData.data = new Uint8Array(0)
      }

      const result = decodeElevation(byteArray)
      byteArray = new Uint8ClampedArray(0)
      return Comlink.transfer(result, [result.buffer])
    } catch (error) {
      console.error('Decoding error:', error)
      throw error
    }
  }

  public async subdivideTile(data: Float32Array, count: number, margin: number, enhance: number, damping: number) {
    try {
      const result = subdivideTile(data, count, margin, enhance, damping)
      return Comlink.transfer(result, [result.buffer])
    } catch (error) {
      console.error('Subdivision error:', error)
      throw error
    }
  }

  public async cleanup() {
    try {
      this.wasmInitialized = false
    } catch (error) {
      console.error('Cleanup error:', error)
      throw error
    }
  }
}

Comlink.expose(new TileDecoderWorker())
export type TileDecoderWorkerType = InstanceType<typeof TileDecoderWorker>
