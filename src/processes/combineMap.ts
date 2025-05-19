import type { MapOption } from '~/types/types'
import { getMinMaxHeight } from '~/utils/elevation'

export const combineMap = (
  heightmap: Float32Array,
  noiseMap: Float32Array | undefined,
  waterMap: Float32Array,
  waterWayMap: Float32Array,
  waterDepthMap: Float32Array,
  option: MapOption,
  getMinMax: boolean,
) => {
  const { depth, streamDepth } = option.settings
  const result = new Float32Array(heightmap.length)

  for (let i = 0; i < heightmap.length; i++) {
    const landArea = waterMap[i] * waterWayMap[i] === 1 ? 1 : 0
    const waterDepth = Math.max((1 - waterMap[i]) * (depth + waterDepthMap[i]), (1 - waterWayMap[i]) * (streamDepth + waterDepthMap[i]))
    const noise = noiseMap ? noiseMap[i] : 0
    result[i] = heightmap[i] + landArea * noise - waterDepth
  }

  const { min, max } = getMinMax ? getMinMaxHeight(result, 100) : { min: 0, max: 0 }

  return {
    result,
    min,
    max,
  }
}
