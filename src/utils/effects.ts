import { allocate_memory, free_memory, gaussian_blur, unsharp_mask, noise as gen_noise, type InitOutput } from '~~/effects_lib/pkg'

export const gaussianBlur = (instance: InitOutput | undefined, data: Float32Array, radius: number, blend: number): Promise<Float32Array> => {
  return new Promise((resolve, reject) => {
    if (!instance) {
      return reject(new Error('gaussianBlur: Initialization required.'))
    }

    try {
      const result = new Float32Array(data.length)
      const inputPtr = allocate_memory(data.length)
      const outputPtr = allocate_memory(data.length)

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

      free_memory(inputPtr, data.length)
      free_memory(outputPtr, data.length)

      resolve(result)
    } catch (error) {
      reject(error)
    }
  })
}

export const unsharpMask = (instance: InitOutput | undefined, data: Float32Array, amount: number, radius: number): Promise<Float32Array> => {
  return new Promise((resolve, reject) => {
    if (!instance) {
      return reject(new Error('unsharpMask: Initialization required.'))
    }

    try {
      const result = new Float32Array(data.length)
      const inputPtr = allocate_memory(data.length)
      const blurredPtr = allocate_memory(data.length)
      const outputPtr = allocate_memory(data.length)

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

      free_memory(inputPtr, data.length)
      free_memory(blurredPtr, data.length)
      free_memory(outputPtr, data.length)

      resolve(result)
    } catch (error) {
      reject(error)
    }
  })
}

export const noise = (instance: InitOutput | undefined, data: Float32Array, amount: number, range: number, pixelDistance: number): Promise<Float32Array> => {
  return new Promise((resolve, reject) => {
    if (!instance) {
      return reject(new Error('noise: Initialization required.'))
    }

    try {
      const result = new Float32Array(data.length)
      const inputPtr = allocate_memory(data.length)
      const outputPtr = allocate_memory(data.length)

      const input = new Float32Array(
        instance.memory.buffer,
        inputPtr,
        data.length,
      )
      input.set(data)

      gen_noise(inputPtr, outputPtr, data.length, amount, range, pixelDistance)

      const output = new Float32Array(
        instance.memory.buffer,
        outputPtr,
        data.length,
      )
      result.set(output)

      free_memory(inputPtr, data.length)
      free_memory(outputPtr, data.length)

      resolve(result)
    } catch (error) {
      reject(error)
    }
  })
}
