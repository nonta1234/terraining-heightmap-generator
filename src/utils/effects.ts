import { allocate_memory, free_memory, gaussian_blur, unsharp_mask, type InitOutput } from '~~/effects_lib/pkg'

export const gaussianBlur = (instance: InitOutput | undefined, data: Float32Array, radius: number, blend: number) => {
  if (!instance) {
    throw new Error('gaussianBlur: Initialization required.')
  }
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

  return result
}

export const unsharpMask = (instance: InitOutput | undefined, data: Float32Array, amount: number, radius: number) => {
  if (!instance) {
    throw new Error('unsharpMask: Initialization required.')
  }
  const result = new Float32Array(data.length)
  const size = Math.sqrt(data.length)
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
  unsharp_mask(inputPtr, blurredPtr, outputPtr, size, size, amount)

  const output = new Float32Array(
    instance.memory.buffer,
    outputPtr,
    data.length,
  )
  result.set(output)

  free_memory(inputPtr, data.length)
  free_memory(blurredPtr, data.length)
  free_memory(outputPtr, data.length)

  return result
}
