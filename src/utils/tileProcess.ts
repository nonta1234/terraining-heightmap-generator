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

export const scaleDownWorldMap = (data: Float32Array) => {
  const result = new Float32Array(16777216)   // 4096^2
  const width = 16384

  for (let y = 0; y < 4096; y++) {
    const baseIndex = y * 4 * width
    const resultIndex = y * 4096
    for (let x = 0; x < 4096; x++) {
      const index = baseIndex + x * 4
      result[resultIndex + x] = (
        data[index + width + 1]
        + data[index + width + 2]
        + data[index + 2 * width + 1]
        + data[index + 2 * width + 2]
      ) * 0.25
    }
  }

  return result
}

export const blendMapsWithFeathering = async (worldMap: Float32Array, heightmap: Float32Array, featherSize: number) => {
  const padding = 100
  const worldMapSize = 16584
  const heightmapSize = 4296

  const result = worldMap

  const startX = Math.floor((worldMapSize - heightmapSize) / 2)
  const startY = Math.floor((worldMapSize - heightmapSize) / 2)

  // core position
  const coreStart = padding
  const coreEnd = heightmapSize - padding

  // 1. core
  for (let yB = coreStart; yB < coreEnd; yB++) {
    const yA = startY + yB
    for (let xB = coreStart; xB < coreEnd; xB++) {
      const xA = startX + xB
      result[yA * worldMapSize + xA] = heightmap[yB * heightmapSize + xB]
    }
  }

  // 2. top
  for (let yB = coreStart - featherSize; yB < coreStart; yB++) {
    const yA = startY + yB
    for (let xB = coreStart; xB < coreEnd; xB++) {
      const xA = startX + xB
      const weight = (yB - (coreStart - featherSize)) / featherSize
      const indexB = yB * heightmapSize + xB
      const indexA = yA * worldMapSize + xA
      result[indexA] = heightmap[indexB] * weight + result[indexA] * (1 - weight)
    }
  }

  // 3. bottom
  for (let yB = coreEnd; yB < coreEnd + featherSize; yB++) {
    const yA = startY + yB
    for (let xB = coreStart; xB < coreEnd; xB++) {
      const xA = startX + xB
      const weight = (coreEnd + featherSize - yB) / featherSize
      const indexB = yB * heightmapSize + xB
      const indexA = yA * worldMapSize + xA
      result[indexA] = heightmap[indexB] * weight + result[indexA] * (1 - weight)
    }
  }

  // 4. left
  for (let yB = coreStart; yB < coreEnd; yB++) {
    const yA = startY + yB
    for (let xB = coreStart - featherSize; xB < coreStart; xB++) {
      const xA = startX + xB
      const weight = (xB - (coreStart - featherSize)) / featherSize
      const indexB = yB * heightmapSize + xB
      const indexA = yA * worldMapSize + xA
      result[indexA] = heightmap[indexB] * weight + result[indexA] * (1 - weight)
    }
  }

  // 5. right
  for (let yB = coreStart; yB < coreEnd; yB++) {
    const yA = startY + yB
    for (let xB = coreEnd; xB < coreEnd + featherSize; xB++) {
      const xA = startX + xB
      const weight = (coreEnd + featherSize - xB) / featherSize
      const indexB = yB * heightmapSize + xB
      const indexA = yA * worldMapSize + xA
      result[indexA] = heightmap[indexB] * weight + result[indexA] * (1 - weight)
    }
  }

  // 6. corner
  // top-left
  for (let yB = coreStart - featherSize; yB < coreStart; yB++) {
    const yA = startY + yB
    for (let xB = coreStart - featherSize; xB < coreStart; xB++) {
      const xA = startX + xB
      const weightY = (yB - (coreStart - featherSize)) / featherSize
      const weightX = (xB - (coreStart - featherSize)) / featherSize
      const weight = Math.min(weightX, weightY)
      const indexB = yB * heightmapSize + xB
      const indexA = yA * worldMapSize + xA
      result[indexA] = heightmap[indexB] * weight + result[indexA] * (1 - weight)
    }
  }

  // top-right
  for (let yB = coreStart - featherSize; yB < coreStart; yB++) {
    const yA = startY + yB
    for (let xB = coreEnd; xB < coreEnd + featherSize; xB++) {
      const xA = startX + xB
      const weightY = (yB - (coreStart - featherSize)) / featherSize
      const weightX = (coreEnd + featherSize - xB) / featherSize
      const weight = Math.min(weightX, weightY)
      const indexB = yB * heightmapSize + xB
      const indexA = yA * worldMapSize + xA
      result[indexA] = heightmap[indexB] * weight + result[indexA] * (1 - weight)
    }
  }

  // bottom-left
  for (let yB = coreEnd; yB < coreEnd + featherSize; yB++) {
    const yA = startY + yB
    for (let xB = coreStart - featherSize; xB < coreStart; xB++) {
      const xA = startX + xB
      const weightY = (coreEnd + featherSize - yB) / featherSize
      const weightX = (xB - (coreStart - featherSize)) / featherSize
      const weight = Math.min(weightX, weightY)
      const indexB = yB * heightmapSize + xB
      const indexA = yA * worldMapSize + xA
      result[indexA] = heightmap[indexB] * weight + result[indexA] * (1 - weight)
    }
  }

  // bottom-right
  for (let yB = coreEnd; yB < coreEnd + featherSize; yB++) {
    const yA = startY + yB
    for (let xB = coreEnd; xB < coreEnd + featherSize; xB++) {
      const xA = startX + xB
      const weightY = (coreEnd + featherSize - yB) / featherSize
      const weightX = (coreEnd + featherSize - xB) / featherSize
      const weight = Math.min(weightX, weightY)
      const indexB = yB * heightmapSize + xB
      const indexA = yA * worldMapSize + xA
      result[indexA] = heightmap[indexB] * weight + result[indexA] * (1 - weight)
    }
  }

  return result
}

export const splitTile = async (data: Float32Array, divisions: number, padding: number) => {
  const size = Math.sqrt(data.length)
  const coreSize = size - padding * 2
  const dividedSize = Math.floor(coreSize / divisions)
  const correction = coreSize % dividedSize
  const tileSize = dividedSize + padding * 2 + correction
  const result: Float32Array[] = new Array(divisions * divisions)
  const promises: Promise<void>[] = []

  const copyTile = (dst: Float32Array, startX: number, startY: number) => {
    for (let y = 0; y < tileSize; y++) {
      const srcStart = (startY + y) * size + startX
      const dstStart = y * tileSize
      dst.set(data.subarray(srcStart, srcStart + tileSize), dstStart)
    }
  }

  for (let row = 0; row < divisions; row++) {
    const startY = row * dividedSize
    for (let col = 0; col < divisions; col++) {
      const dst = new Float32Array(tileSize * tileSize)
      const startX = col * dividedSize
      const index = row * divisions + col

      const copyPromise = new Promise<void>((resolve) => {
        copyTile(dst, startX, startY)
        resolve()
      })

      promises.push(
        copyPromise.then(() => {
          result[index] = dst
        }),
      )
    }
  }

  await Promise.all(promises)
  return result
}

export const mergeTiles = (tiles: Float32Array[], resolution: number, padding: number) => {
  const divisions = Math.sqrt(tiles.length)
  const tileSize = Math.sqrt(tiles[0].length)
  const coreSize = resolution - padding * 2
  const dividedSize = Math.floor(coreSize / divisions)
  const startSize = dividedSize + padding
  const endSize = dividedSize + (coreSize % dividedSize)

  const result = new Float32Array(resolution * resolution)

  for (let row = 0; row < divisions; row++) {
    const height = row === 0 ? startSize : (row === divisions - 1 ? endSize : dividedSize)
    const startY = row * dividedSize + (row === 0 ? 0 : padding)
    const offsetY = row === 0 ? 0 : padding

    for (let col = 0; col < divisions; col++) {
      const width = col === 0 ? startSize : (col === divisions - 1 ? endSize : dividedSize)
      const startX = col * dividedSize + (col === 0 ? 0 : padding)
      const offsetX = col === 0 ? 0 : padding

      const tile = tiles[row * divisions + col]

      for (let y = 0; y < height; y++) {
        const subarrayStart = (y + offsetY) * tileSize + offsetX
        const subarrayEnd = subarrayStart + width
        result.set(tile.subarray(subarrayStart, subarrayEnd), (startY + y) * resolution + startX)
      }
    }
  }

  return result
}
