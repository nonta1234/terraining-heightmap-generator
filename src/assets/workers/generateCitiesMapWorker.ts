import { createNoise2D } from 'simplex-noise'
import type { GenerateMapOption } from '~/types/types'

const transposeArrayData = (arr: Float32Array, srcRows: number, srcCols: number) => {
  const transposed = []
  for (let i = 0; i < srcCols; i++) {
    for (let j = 0; j < srcRows; j++) {
      transposed.push(arr[j * srcCols + i])
    }
  }
  return new Float32Array(transposed)
}

const getSharpenMask = (map: Float32Array, shrpThres: number, shrpFade: number) => {
  const mask = new Float32Array(map.length)
  const min = shrpThres
  const max = shrpThres + shrpFade
  for (let i = 0; i < map.length; i++) {
    if (map[i] < min) {
      mask[i] = 0
    } else if (map[i] < max) {
      mask[i] = (map[i] - min) / shrpFade
    } else {
      mask[i] = 1
    }
  }
  return mask
}

const getSmoothMask = (map: Float32Array, smthThres: number, smthFade: number) => {
  const mask = new Float32Array(map.length)
  const max = smthThres
  const min = smthThres - smthFade
  for (let i = 0; i < map.length; i++) {
    if (map[i] < min) {
      mask[i] = 1
    } else if (map[i] < max) {
      mask[i] = (max - map[i]) / smthFade
    } else {
      mask[i] = 0
    }
  }
  return mask
}

const getSmoothedMap = (map: Float32Array) => {
  const size = Math.sqrt(map.length)
  const tmpMap1 = new Float32Array(map.length)

  for (let y = 0; y < size; y++) {
    tmpMap1[y * size] = map[y * size] * 3 + map[y * size + 1] + map[y * size + 2]
    tmpMap1[y * size + 1] = map[y * size] * 2 + map[y * size + 1] + map[y * size + 2] + map[y * size + 3]
    for (let x = 2; x < size - 2; x++) {
      tmpMap1[y * size + x] = map[y * size + x - 2] + map[y * size + x - 1] + map[y * size + x] + map[y * size + x + 1] + map[y * size + x + 2]
    }
    tmpMap1[y * size + size - 2] = map[y * size + size - 4] + map[y * size + size - 3] + map[y * size + size - 2] + map[y * size + size - 1] * 2
    tmpMap1[y * size + size - 1] = map[y * size + size - 3] + map[y * size + size - 2] + map[y * size + size - 1] * 3
  }
  const tmpMap2 = transposeArrayData(tmpMap1, size, size)
  const tmpMap3 = new Float32Array(map.length)

  for (let y = 0; y < size; y++) {
    tmpMap3[y * size] = (tmpMap2[y * size] * 3 + tmpMap2[y * size + 1] + tmpMap2[y * size + 2]) / 25
    tmpMap3[y * size + 1] = (tmpMap2[y * size] * 2 + tmpMap2[y * size + 1] + tmpMap2[y * size + 2] + tmpMap2[y * size + 3]) / 25
    for (let x = 2; x < size - 2; x++) {
      tmpMap3[y * size + x] = (tmpMap2[y * size + x - 2] + tmpMap2[y * size + x - 1] + tmpMap2[y * size + x] + tmpMap2[y * size + x + 1] + tmpMap2[y * size + x + 2]) / 25
    }
    tmpMap3[y * size + size - 2] = (tmpMap2[y * size + size - 4] + tmpMap2[y * size + size - 3] + tmpMap2[y * size + size - 2] + tmpMap2[y * size + size - 1] * 2) / 25
    tmpMap3[y * size + size - 1] = (tmpMap2[y * size + size - 3] + tmpMap2[y * size + size - 2] + tmpMap2[y * size + size - 1] * 3) / 25
  }
  const smoothedMap = transposeArrayData(tmpMap3, size, size)
  return smoothedMap
}

const getSharpenMap = (map: Float32Array, smoothedMap: Float32Array, k: number) => {
  const sharpenMap = new Float32Array(map.length)
  for (let i = 0; i < map.length; i++) {
    sharpenMap[i] = map[i] + (map[i] - smoothedMap[i]) * k
  }
  return sharpenMap
}


class GenerateCitiesMapWorker {
  private worker: Worker

  constructor() {
    this.worker = self as any
    self.onmessage = this.handleMessage.bind(this)
  }

  private handleMessage(e: MessageEvent<any>) {
    const message = e.data
    const { mapType, settings } = message.body as GenerateMapOption
    const heightmap = message.heightmap
    const waterMap = message.waterMap
    const waterWayMap = message.waterWayMap

    const alphaSharpen = settings.sharpen / 10
    const alphaSmooth = settings.smoothing / 100
    const effectedMap = new Float32Array(heightmap.length)
    const smoothedMask = getSmoothMask(heightmap, settings.smthThres, settings.smthFade)
    const sharpenMask = getSharpenMask(heightmap, settings.shrpThres, settings.shrpFade)
    const tmpSmoothedMap = getSmoothedMap(heightmap)

    let vec = tmpSmoothedMap
    if (settings.smoothCount > 1) {
      for (let i = 2; i <= settings.smoothCount; i++) {
        const tmpVec = getSmoothedMap(vec)
        vec = tmpVec
      }
    }
    const smoothedMap = vec

    const sharpenMap = getSharpenMap(heightmap!, tmpSmoothedMap, alphaSharpen)
    const maskedSharpenMap = new Float32Array(sharpenMap.length)
    for (let i = 0; i < sharpenMap.length; i++) {
      maskedSharpenMap[i] = heightmap![i] * (1 - sharpenMask[i]) + sharpenMap[i] * sharpenMask[i]
    }

    const maskedSmoothMap = new Float32Array(smoothedMap.length)
    for (let i = 0; i < smoothedMap.length; i++) {
      maskedSmoothMap[i] = maskedSharpenMap[i] * (1 - smoothedMask[i]) + smoothedMap[i] * smoothedMask[i]
    }

    // adjust elevation
    const strm = Math.min(settings.depth, settings.streamDepth)

    if (settings.noise === 0) {
      for (let i = 0; i < effectedMap.length; i++) {
        let h = (maskedSharpenMap[i] * (1 - alphaSmooth) + maskedSmoothMap[i] * alphaSmooth) - settings.seaLevel
        if (h < 0) { h = 0 }
        const waterDepth = Math.max((1 - waterMap![i]) * settings.depth, (1 - waterWayMap![i]) * strm)
        effectedMap[i] = h * settings.vertScale + settings.depth - waterDepth
      }
    } else {
      const size = Math.sqrt(effectedMap.length)
      const noise2D = createNoise2D()

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const noiseValue = noise2D(x * settings.noiseGrid / (size - 1), y * settings.noiseGrid / (size - 1)) * settings.noise
          let h = (maskedSharpenMap[y * size + x] * (1 - alphaSmooth) + maskedSmoothMap[y * size + x] * alphaSmooth) - settings.seaLevel
          if (h < 0) {
            h = 0
          } else if (h > settings.noise) {
            h += noiseValue
          }
          const waterDepth = Math.max((1 - waterMap[y * size + x]) * settings.depth, (1 - waterWayMap[y * size + x]) * strm)
          effectedMap[y * size + x] = h * settings.vertScale + settings.depth - waterDepth
        }
      }
    }

    // triming
    const croppedMap = []
    const mapPixels = settings.resolution
    const mapSizePixelsWithBuffer = mapPixels + 4
    const scaleFactor = mapType !== 'cs1' ? settings.elevationScale / 65535 : 0.015625

    for (let y = 2; y < mapSizePixelsWithBuffer - 2; y++) {
      const row = effectedMap.slice(y * mapSizePixelsWithBuffer + 2, y * mapSizePixelsWithBuffer + 2 + mapPixels)
      croppedMap.push(...row)
    }

    const citiesMap = new Uint8ClampedArray(mapPixels * mapPixels * 2)

    for (let i = 0; i < croppedMap.length; i++) {
      const h = Math.round(croppedMap[i] / scaleFactor)
      citiesMap[i * 2] = h >> 8
      citiesMap[i * 2 + 1] = h & 255
    }

    const resultMap = new Uint8Array(citiesMap)
    this.worker.postMessage(resultMap, [resultMap.buffer])
  }
}

export default new GenerateCitiesMapWorker()
