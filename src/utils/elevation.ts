export const extractArray = (array: Float32Array, startX: number, startY: number, cropSize: number) => {
  const imageSize = Math.sqrt(array.length)
  const result = new Float32Array(cropSize * cropSize)
  for (let y = 0; y < cropSize; y++) {
    const originalStartIndex = (startY + y) * imageSize + startX
    const cropStartIndex = y * cropSize
    result.set(array.subarray(originalStartIndex, originalStartIndex + cropSize), cropStartIndex)
  }
  return result
}

/**
 * This is for blending heightmaps and oceanmaps.\
 * In Oceanmap, 0m is defined as land, so the 0m area in the heightmap is replaced by oceanmap.\
 * For heightmaps below 0m, areas below sea level are also considered.
 * @param heightmap
 * @param oceanmap
 * @returns Float32Array
 */
export const mixArray = (heightmap: Float32Array, oceanmap: Float32Array) => {
  const length = heightmap.length
  const result = new Float32Array(length)

  for (let i = 0; i < length; i++) {
    result[i] = heightmap[i] === 0 ? oceanmap[i] : heightmap[i]
  }
  return result
}

export const splitTile = (data: Float32Array, overlap: number) => {
  const size = Math.sqrt(data.length)
  const correction = size % 2
  const halfSize = Math.floor(size / 2)
  const tileSize = halfSize + overlap + correction
  const offset = halfSize - overlap

  const topleft = new Float32Array(tileSize * tileSize)
  const topright = new Float32Array(tileSize * tileSize)
  const bottomleft = new Float32Array(tileSize * tileSize)
  const bottomright = new Float32Array(tileSize * tileSize)

  function copyTile(dst: Float32Array, startX: number, startY: number) {
    for (let y = 0; y < tileSize; y++) {
      const srcStart = (startY + y) * size + startX
      const dstStart = y * tileSize
      dst.set(data.subarray(srcStart, srcStart + tileSize), dstStart)
    }
  }

  copyTile(topleft, 0, 0)
  copyTile(topright, offset, 0)
  copyTile(bottomleft, 0, offset)
  copyTile(bottomright, offset, offset)

  return {
    topleft,
    topright,
    bottomleft,
    bottomright,
  }
}

export const mergeTiles = (
  topleft: Float32Array,
  topright: Float32Array,
  bottomleft: Float32Array,
  bottomright: Float32Array,
  correction: number,
  padding: number,
) => {
  const tileSize = Math.sqrt(topleft.length)
  const leftWidth = tileSize - correction - padding
  const rightWidth = tileSize - padding
  const topHeight = leftWidth
  const bottomHeight = rightWidth
  const resolution = leftWidth + rightWidth

  const result = new Float32Array(resolution * resolution)

  const copyTile = (src: Float32Array, sizeX: number, sizeY: number, srcOffsetX: number, srcOffsetY: number, dstOffsetX: number, dstOffsetY: number) => {
    for (let y = 0; y < sizeY; y++) {
      const srcStart = (srcOffsetY + y) * tileSize + srcOffsetX
      const dstStart = (dstOffsetY + y) * resolution + dstOffsetX
      result.set(src.subarray(srcStart, srcStart + sizeX), dstStart)
    }
  }

  copyTile(topleft, leftWidth, topHeight, 0, 0, 0, 0)
  copyTile(topright, rightWidth, topHeight, padding, 0, leftWidth, 0)
  copyTile(bottomleft, leftWidth, bottomHeight, 0, padding, 0, topHeight)
  copyTile(bottomright, rightWidth, bottomHeight, padding, padding, leftWidth, topHeight)

  return result
}

/**
 * This is a function that temporarily quadruples the resolution of world map by bicubic interpolation.
 * @param elevations
 * @returns Float32Array
 */
export const scaleUpBicubic = (elevations: Float32Array) => {
  const originalSize = 4096
  const padding = 100
  const fullSize = originalSize + 2 * padding
  const scale = 4
  const newSize = originalSize * scale
  const outputSize = newSize + 2 * padding
  const heightMap = new Float32Array(outputSize * outputSize)

  // Mitchell-Netravali cubic filter parameters (b = 1/3, c = 1/3)
  const b = 1 / 3
  const c = 1 / 3
  const coeff = cubicBCcoefficient(b, c)

  for (let y = 0; y < newSize; y++) {
    for (let x = 0; x < newSize; x++) {
      const posX = x / scale
      const posY = y / scale

      const x0 = Math.floor(posX) + padding
      const y0 = Math.floor(posY) + padding
      const tx = posX - Math.floor(posX)
      const ty = posY - Math.floor(posY)

      const fx = [
        cubicFunc(1 + tx, coeff),
        cubicFunc(tx, coeff),
        cubicFunc(1 - tx, coeff),
        cubicFunc(2 - tx, coeff),
      ]
      const fy = [
        cubicFunc(1 + ty, coeff),
        cubicFunc(ty, coeff),
        cubicFunc(1 - ty, coeff),
        cubicFunc(2 - ty, coeff),
      ]

      const tmpVals = [
        fy[0] * elevations[(y0 - 1) * fullSize + (x0 - 1)] + fy[1] * elevations[y0 * fullSize + (x0 - 1)] + fy[2] * elevations[(y0 + 1) * fullSize + (x0 - 1)] + fy[3] * elevations[(y0 + 2) * fullSize + (x0 - 1)],
        fy[0] * elevations[(y0 - 1) * fullSize + x0] + fy[1] * elevations[y0 * fullSize + x0] + fy[2] * elevations[(y0 + 1) * fullSize + x0] + fy[3] * elevations[(y0 + 2) * fullSize + x0],
        fy[0] * elevations[(y0 - 1) * fullSize + (x0 + 1)] + fy[1] * elevations[y0 * fullSize + (x0 + 1)] + fy[2] * elevations[(y0 + 1) * fullSize + (x0 + 1)] + fy[3] * elevations[(y0 + 2) * fullSize + (x0 + 1)],
        fy[0] * elevations[(y0 - 1) * fullSize + (x0 + 2)] + fy[1] * elevations[y0 * fullSize + (x0 + 2)] + fy[2] * elevations[(y0 + 1) * fullSize + (x0 + 2)] + fy[3] * elevations[(y0 + 2) * fullSize + (x0 + 2)],
      ]

      heightMap[(y + padding) * outputSize + (x + padding)] = fx[0] * tmpVals[0] + fx[1] * tmpVals[1] + fx[2] * tmpVals[2] + fx[3] * tmpVals[3]
    }
  }

  function cubicBCcoefficient(b: number, c: number) {
    const p = 2 - 1.5 * b - c
    const q = -3 + 2 * b + c
    const r = 0
    const s = 1 - (1 / 3) * b
    const t = -(1 / 6) * b - c
    const u = b + 5 * c
    const v = -2 * b - 8 * c
    const w = (4 / 3) * b + 4 * c
    return [p, q, r, s, t, u, v, w]
  }

  function cubicFunc(x: number, coeff: number[]) {
    const [p, q, r, s, t, u, v, w] = coeff
    let y = 0
    const ax = Math.abs(x)
    if (ax < 1) {
      y = ((p * ax + q) * ax + r) * ax + s
    } else if (ax < 2) {
      y = ((t * ax + u) * ax + v) * ax + w
    }
    return y
  }

  return heightMap
}

export const integrateHightmapWithFeathering = (worldMap: Float32Array, heightmap: Float32Array, featherSize: number) => {
  const padding = 100
  const worldMapSize = 16584
  const heightmapSize = 4296

  const result = new Float32Array(worldMap)

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

export const getMinMaxHeight = (map: Float32Array, padding = 0) => {
  const heights = { min: 100000, max: -100000 }
  const size = Math.sqrt(map.length)
  const endIndex = size - padding
  for (let y = padding; y < endIndex; y++) {
    for (let x = padding; x < endIndex; x++) {
      const h = map[y * size + x]
      if (h > heights.max) { heights.max = h }
      if (h < heights.min) { heights.min = h }
    }
  }
  return heights
}

export const terrainRGB2Height = (r: number, g: number, b: number) => {
  return -10000 + (r * 6553.6 + g * 25.6 + b * 0.1)
}

export const height2TerrainRGB = (height: number) => {
  const h = height * 10 + 100000
  const r = (h & 0xFF0000) >> 24
  const g = (h & 0xFF00) >> 16
  const b = h & 0xFF
  return { r, g, b }
}

export const decodeElevation = (arr: Uint8ClampedArray) => {
  const arrLength = arr.length / 4
  const elevs = new Float32Array(arrLength)
  let arrIndex = 0
  for (let i = 0; i < arrLength; i++) {
    elevs[i] = terrainRGB2Height(arr[arrIndex], arr[arrIndex + 1], arr[arrIndex + 2])
    arrIndex += 4
  }
  return elevs
}
