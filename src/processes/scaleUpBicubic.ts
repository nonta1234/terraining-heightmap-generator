import init, { allocate_memory, free_memory, scale_up_bicubic, type InitOutput } from '~~/wasm/tiles_lib/pkg'

export const scaleUpBicubic = async (data: Float32Array) => {
  let inputPtr: number | undefined
  let outputPtr: number | undefined
  let instance: InitOutput | null = await init()

  const originalSize = 4096
  const padding = 100
  const scale = 4
  const newSize = originalSize * scale
  const outputSize = newSize + 2 * padding
  const outputLength = outputSize * outputSize

  try {
    inputPtr = allocate_memory(data.length)
    outputPtr = allocate_memory(outputLength)
    const result = new Float32Array(outputLength)

    const input = new Float32Array(
      instance.memory.buffer,
      inputPtr,
      data.length,
    )
    input.set(data)

    scale_up_bicubic(inputPtr, outputPtr)

    const output = new Float32Array(
      instance.memory.buffer,
      outputPtr,
      outputLength,
    )
    result.set(output)

    return result
  } catch (error) {
    console.error(error)
  } finally {
    if (inputPtr !== undefined) {
      free_memory(inputPtr, data.length)
    }
    if (outputPtr !== undefined) {
      free_memory(outputPtr, outputLength)
    }
    instance = null
  }
}
