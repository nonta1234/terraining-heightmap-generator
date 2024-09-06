export const transposeArray = (arr: Array<number>, srcRows: number, srcCols: number) => {
  const transposed = []
  for (let i = 0; i < srcCols; i++) {
    for (let j = 0; j < srcRows; j++) {
      transposed.push(arr[j * srcCols + i])
    }
  }
  return transposed
}

export const remToPx = (rem: number) => {
  const fontSize = getComputedStyle(document.documentElement).fontSize
  return rem * parseFloat(fontSize)
}

/**
 * Converts a feet and inches string to meters.
 * @param feetString A string in feet and inches format (e.g., "16'3\"")
 * @returns The equivalent value in meters
 */
function feetToMeters(feetString: string): number {
  const match = feetString.match(/(\d+)'(\d+)"/)
  if (match) {
    const feet = parseInt(match[1], 10)
    const inches = parseInt(match[2], 10)
    const meters = (feet * 0.3048) + (inches * 0.0254)
    return meters
  } else {
    return 5
  }
}

/**
* Determines if the value is in meters or feet and converts to meters if in feet.
* @param value A number (meters) or a string (feet and inches)
* @returns The value in meters
*/
export const convertToMeters = (value: string | number) => {
  if (typeof value === 'number') {
    // Return the value as-is if it's already in meters
    return value
  } else if (typeof value === 'string') {
    // Convert feet and inches to meters if the value is a string
    try {
      return feetToMeters(value)
    } catch (error) {
      console.error((error as Error).message)
      return 5 // Return default value if an error occurs
    }
  } else {
    throw new Error('Invalid value type')
  }
}

export const adjustElevation = (maxHeight: number) => {
  const mapbox = useMapbox()
  if (mapbox.value.settings.type !== 'manual') {
    const csMaxHeight = (mapbox.value.settings.gridInfo === 'cs1' ? 1023.984375 : mapbox.value.settings.elevationScale) - mapbox.value.settings.depth
    const elevationRange = maxHeight - mapbox.value.settings.baseLevel
    if (mapbox.value.settings.type === 'maximize' || elevationRange * mapbox.value.settings.vertScale > csMaxHeight) {
      mapbox.value.settings.vertScale = csMaxHeight / elevationRange
    }
  }
}

export const getMinMaxHeight = (map: Float32Array, padding: number) => {
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
