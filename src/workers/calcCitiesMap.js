const transposeArray = (arr, srcRows, srcCols) => {
  const transposed = []
  for (let i = 0; i < srcCols; i++) {
    for (let j = 0; j < srcRows; j++) {
      transposed.push(arr[j * srcCols + i])
    }
  }
  return transposed
}


const getSharpenMask = (map, shrpThres, shrpFade) => {
  const mask = new Array(map.length)
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


const getSmoothMask = (map, smthThres, smthFade) => {
  const mask = new Array(map.length)
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


const getSmoothedMap = (map) => {
  const size = Math.sqrt(map.length)
  const tmpMap1 = new Array(map.length)

  for (let y = 0; y < size; y++) {
    tmpMap1[y * size] = 0
    tmpMap1[y * size + 1] = 0
    for (let x = 2; x < size - 2; x++) {
      tmpMap1[y * size + x] = map[y * size + x - 2] + map[y * size + x - 1] + map[y * size + x] + map[y * size + x + 1] + map[y * size + x + 2]
    }
    tmpMap1[y * size + size - 2] = 0
    tmpMap1[y * size + size - 1] = 0
  }

  const tmpMap2 = transposeArray(tmpMap1, size, size)
  const tmpMap3 = new Array(map.length)

  for (let y = 0; y < size; y++) {
    tmpMap3[y * size] = 0
    tmpMap3[y * size + 1] = 0
    for (let x = 2; x < size - 2; x++) {
      tmpMap3[y * size + x] = (tmpMap2[y * size + x - 2] + tmpMap2[y * size + x - 1] + tmpMap2[y * size + x] + tmpMap2[y * size + x + 1] + tmpMap2[y * size + x + 2]) / 25
    }
    tmpMap3[y * size + size - 2] = 0
    tmpMap3[y * size + size - 1] = 0
  }

  const smoothedMap = transposeArray(tmpMap3, size, size)

  return smoothedMap
}


const getSharpenMap = (map, smoothedMap, k) => {
  const sharpenMap = new Array(map.length)
  for (let i = 0; i < map.length; i++) {
    sharpenMap[i] = map[i] + (map[i] - smoothedMap[i]) * k
  }
  return sharpenMap
}


self.addEventListener('message', function(e) {
  const {
    tmpHeightMap,
    waterMap,
    waterwayMap,
    seaLevel,
    vertScale,
    smoothing,
    smthThres,
    smthFade,
    sharpen,
    shrpThres,
    shrpFade,
    depth,
    streamDepth,
    mapSizePixels,
    mapSizePixelsWithBuffer,
  } = e.data

  const alphaSharpen = sharpen / 10
  const alphaSmooth = smoothing / 100

  const effectedMap = new Array(tmpHeightMap.length)

  const smoothedMask = getSmoothMask(tmpHeightMap, smthThres, smthFade)
  const sharpenMask = getSharpenMask(tmpHeightMap, shrpThres, shrpFade)

  const smoothedMap = getSmoothedMap(tmpHeightMap)

  const sharpenMap = getSharpenMap(tmpHeightMap, smoothedMap, alphaSharpen)
  const maskedSharpenMap = new Array(sharpenMap.length)
  for (let i = 0; i < sharpenMap.length; i++) {
    maskedSharpenMap[i] = tmpHeightMap[i] * (1 - sharpenMask[i]) + sharpenMap[i] * sharpenMask[i]
  }

  const maskedSmoothMap = new Array(smoothedMap.length)
  for (let i = 0; i < smoothedMap.length; i++) {
    maskedSmoothMap[i] = maskedSharpenMap[i] * (1 - smoothedMask[i]) + smoothedMap[i] * smoothedMask[i]
  }

  // adjust elevation
  for (let i = 0; i < effectedMap.length; i++) {
    effectedMap[i] = (maskedSharpenMap[i] * (1 - alphaSmooth) + maskedSmoothMap[i] * alphaSmooth) - seaLevel
    if (effectedMap[i] < 0) { effectedMap[i] = 0 }
    const waterDepth = Math.max((1 - waterMap[i]) * depth, (1 - waterwayMap[i]) * streamDepth)
    effectedMap[i] = effectedMap[i] * vertScale + depth - waterDepth
  }

  // triming
  const croppedMap = []

  for (let y = 2; y < mapSizePixelsWithBuffer - 2; y++) {
    const row = effectedMap.slice(y * mapSizePixelsWithBuffer + 2, y * mapSizePixelsWithBuffer + 2 + mapSizePixels)
    croppedMap.push(...row)
  }

  const citiesMap = new Uint8ClampedArray(mapSizePixels * mapSizePixels * 2)

  for (let i = 0; i < croppedMap.length; i++) {
    let h = Math.round(croppedMap[i] / 0.015625)
    if (h > 65535) { h = 65535 }
    citiesMap[i * 2] = h >> 8
    citiesMap[i * 2 + 1] = h & 255
  }

  self.postMessage(citiesMap)
}, false)
