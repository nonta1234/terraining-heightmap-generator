import type { SingleMapOption, ProgressData } from '~/types/types'
import { mixArray } from '~/utils/elevation'
import { getHeightmap } from '~/utils/getHeightmap'
import { getWaterMap } from '~/utils/getWaterMap'
import { getWaterDepthCorrectionMap } from '~/utils/getWaterDepthCorrectionMap'

export const getTileData = async (option: SingleMapOption, progressCallback: (data: ProgressData) => void) => {
  try {
    const {
      settings,
      rasterExtent,
      vectorExtent,
      oceanExtent,
      mapPixels,
      rasterPixels,
      oceanPixels,
      unitSize,
      isDebug,
    } = option

    const vectorPixels = 4096

    const [heightmap, oceanMap, { waterMap, waterWayMap, waterMapImage, waterWayMapImage }, waterDepthMap] = settings.useBathymetry
      ? await Promise.all([
        getHeightmap(settings.gridInfo, settings, rasterExtent, mapPixels, rasterPixels,
          data => progressCallback!(data),
        ),
        getHeightmap('ocean', settings, oceanExtent, mapPixels, oceanPixels,
          data => progressCallback!(data),
        ),
        getWaterMap(settings, vectorExtent, mapPixels, unitSize, false, vectorPixels, isDebug,
          data => progressCallback!(data),
        ),
        getWaterDepthCorrectionMap(settings, mapPixels),
      ])
      : await Promise.all([
        getHeightmap(settings.gridInfo, settings, rasterExtent, mapPixels, rasterPixels,
          data => progressCallback!(data),
        ),
        undefined,
        getWaterMap(settings, vectorExtent, mapPixels, unitSize, true, vectorPixels, isDebug,
          data => progressCallback!(data),
        ),
        getWaterDepthCorrectionMap(settings, mapPixels),
      ])

    const resultHeightmap = oceanMap ? mixArray(heightmap, oceanMap) : heightmap

    return {
      heightmap: resultHeightmap,
      waterMap,
      waterWayMap,
      waterDepthMap,
      waterMapImage,
      waterWayMapImage,
    }
  } catch (error) {
    console.error(error)
  }
}
