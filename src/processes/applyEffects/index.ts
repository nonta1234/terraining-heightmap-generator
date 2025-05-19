import type { MapOption } from '~/types/types'
import { gaussianBlur, unsharpMask, noise } from './effects'

export const applyEffects = async (mapData: Float32Array, option: MapOption) => {
  try {
    const { settings, smoothRadius, sharpenRadius, unitSize } = option

    const blurredMap = settings.smoothing > 0
      ? await gaussianBlur(mapData, smoothRadius, settings.smoothing / 100, settings.smthThres, settings.smthFade) ?? mapData
      : mapData

    const effectedMap = settings.sharpen > 0
      ? await unsharpMask(blurredMap, settings.sharpen / 100, sharpenRadius, settings.shrpThres, settings.shrpFade) ?? blurredMap
      : blurredMap

    const noiseMap = settings.noise > 0
      ? await noise(effectedMap, settings.noise, settings.noiseThres, unitSize, settings.shrpThres, settings.shrpFade)
      : undefined

    return {
      effectedMap,
      noiseMap,
    }
  } catch (error) {
    console.error(error)
  }
}
