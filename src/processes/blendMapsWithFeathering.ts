export const blendMapsWithFeathering = (worldMap0: Float32Array, worldMap1: Float32Array, heightmap: Float32Array, featherSize: number) => {
  const padding = 100
  const worldMapSize = 16584
  const heightmapSize = 4296

  const result = new Float32Array(worldMapSize * worldMapSize)
  result.set(worldMap0)
  result.set(worldMap1, 137514528)

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
