import init, { allocate_memory, free_memory, gaussian_blur, unsharp_mask, noise as gen_noise } from '~~/wasm/effects_lib/pkg'

export const gaussianBlur = async (data: Float32Array, radius: number, blend: number, threshold: number, fade: number) => {
  let inputPtr: number | undefined
  let outputPtr: number | undefined
  const instance = await init()

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

    gaussian_blur(inputPtr, outputPtr, data.length, radius, blend, threshold, fade)

    const output = new Float32Array(
      instance.memory.buffer,
      outputPtr,
      data.length,
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
      free_memory(outputPtr, data.length)
    }
  }
}


export const unsharpMask = async (data: Float32Array, amount: number, radius: number, threshold: number, fade: number) => {
  let inputPtr: number | undefined
  let blurredPtr: number | undefined
  let outputPtr: number | undefined
  const instance = await init()

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

    gaussian_blur(inputPtr, blurredPtr, data.length, radius, 1, 100000, 0)
    unsharp_mask(inputPtr, blurredPtr, outputPtr, data.length, amount, threshold, fade)

    const output = new Float32Array(
      instance.memory.buffer,
      outputPtr,
      data.length,
    )
    result.set(output)

    return result
  } catch (error) {
    console.error(error)
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
}


// amount and unitSize are specified in m scale
export const noise = async (data: Float32Array, amount: number, tri: number, unitSize: number, threshold: number, fade: number) => {
  let inputPtr: number | undefined
  let outputPtr: number | undefined
  const instance = await init()

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

    gen_noise(inputPtr, outputPtr, data.length, amount, tri, unitSize, threshold, fade)

    const output = new Float32Array(
      instance.memory.buffer,
      outputPtr,
      data.length,
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
      free_memory(outputPtr, data.length)
    }
  }
}

