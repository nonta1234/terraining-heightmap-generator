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
    result[i] = heightmap[i] + oceanmap[i]
  }
  return result
}

export const getMinMaxHeight = async (map: Float32Array, padding = 0) => {
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
