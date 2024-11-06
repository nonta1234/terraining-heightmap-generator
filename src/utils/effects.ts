import { allocate_memory, free_memory, gaussian_blur, unsharp_mask, noise as gen_noise, type InitOutput } from '~~/effects_lib/pkg'

export const gaussianBlur = (instance: InitOutput | undefined, data: Float32Array, radius: number, blend: number): Promise<Float32Array> => {
  return new Promise((resolve, reject) => {
    if (!instance) {
      return reject(new Error('gaussianBlur: Initialization required.'))
    }

    let inputPtr: number | undefined
    let outputPtr: number | undefined

    try {
      const result = new Float32Array(data.length)
      inputPtr = allocate_memory(data.length)
      outputPtr = allocate_memory(data.length)

      const input = new Float32Array(
        instance.memory.buffer,
        inputPtr,
        data.length,
      )
      input.set(data)

      gaussian_blur(inputPtr, outputPtr, data.length, radius, blend)

      const output = new Float32Array(
        instance.memory.buffer,
        outputPtr,
        data.length,
      )
      result.set(output)

      resolve(result)
    } catch (error) {
      reject(error)
    } finally {
      if (inputPtr !== undefined) {
        free_memory(inputPtr, data.length)
      }
      if (outputPtr !== undefined) {
        free_memory(outputPtr, data.length)
      }
    }
  })
}

export const unsharpMask = (instance: InitOutput | undefined, data: Float32Array, amount: number, radius: number): Promise<Float32Array> => {
  return new Promise((resolve, reject) => {
    if (!instance) {
      return reject(new Error('unsharpMask: Initialization required.'))
    }

    let inputPtr: number | undefined
    let blurredPtr: number | undefined
    let outputPtr: number | undefined

    try {
      const result = new Float32Array(data.length)
      inputPtr = allocate_memory(data.length)
      blurredPtr = allocate_memory(data.length)
      outputPtr = allocate_memory(data.length)

      const input = new Float32Array(
        instance.memory.buffer,
        inputPtr,
        data.length,
      )
      input.set(data)

      gaussian_blur(inputPtr, blurredPtr, data.length, radius, 1)
      unsharp_mask(inputPtr, blurredPtr, outputPtr, data.length, amount)

      const output = new Float32Array(
        instance.memory.buffer,
        outputPtr,
        data.length,
      )
      result.set(output)

      resolve(result)
    } catch (error) {
      reject(error)
    } finally {
      if (inputPtr !== undefined) {
        free_memory(inputPtr, data.length)
      }
      if (blurredPtr !== undefined) {
        free_memory(blurredPtr, data.length)
      }
      if (outputPtr !== undefined) {
        free_memory(outputPtr, data.length)
      }
    }
  })
}

// amount and unitSize are specified in m scale
export const noise = (instance: InitOutput | undefined, data: Float32Array, amount: number, tri: number, unitSize: number): Promise<Float32Array> => {
  return new Promise((resolve, reject) => {
    if (!instance) {
      return reject(new Error('noise: Initialization required.'))
    }

    let inputPtr: number | undefined
    let outputPtr: number | undefined

    try {
      const result = new Float32Array(data.length)
      inputPtr = allocate_memory(data.length)
      outputPtr = allocate_memory(data.length)

      const input = new Float32Array(
        instance.memory.buffer,
        inputPtr,
        data.length,
      )
      input.set(data)

      gen_noise(inputPtr, outputPtr, data.length, amount, tri, unitSize)

      const output = new Float32Array(
        instance.memory.buffer,
        outputPtr,
        data.length,
      )
      result.set(output)

      resolve(result)
    } catch (error) {
      reject(error)
    } finally {
      if (inputPtr !== undefined) {
        free_memory(inputPtr, data.length)
      }
      if (outputPtr !== undefined) {
        free_memory(outputPtr, data.length)
      }
    }
  })
}
