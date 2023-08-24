export const mapStyle = {
  streets:    'mapbox://styles/mapbox/streets-v12',
  outdoors:   'mapbox://styles/mapbox/outdoors-v12?optimize=true',
  satStreets: 'mapbox://styles/mapbox/satellite-streets-v12',
  satellite:  'mapbox://styles/mapbox/satellite-v9',
  light:      'mapbox://styles/mapbox/light-v11',
  dark:       'mapbox://styles/mapbox/dark-v11',
}

export interface LittoralArray {
  [index: string]: number[]
}

export const littoralArray: LittoralArray = {
  linear: [0.100, 0.200, 0.300, 0.400, 0.500, 0.600, 0.700, 0.800, 0.900],
  sine:   [0.024, 0.095, 0.206, 0.345, 0.500, 0.655, 0.794, 0.905, 0.976],
  cubic:  [0.004, 0.032, 0.108, 0.256, 0.500, 0.744, 0.892, 0.968, 0.996],
  quint:  [0.001, 0.005, 0.039, 0.164, 0.500, 0.836, 0.961, 0.995, 0.999],
}

export const initialValue = {
  lng:        -73.96530,
  lat:        40.78280,
  zoom:       10,
  size:       17.28,
  angle:      0,
  seaLevel:   0,
  adjLevel:   false,
  vScale:     1.00,
  fixedRatio: true,
  type:       'manual',
  depth:      30,
  littoral:   160,
  littArray:  littoralArray.sine,
  smoothing:  0,
  smthThres:  0,
  smthFade:   0,
  sharpen:    0,
  shrpThres:  0,
  shrpFade:   0,
  style:      mapStyle.outdoors,
}

export const mapSizePixels = 1081
export const mapSizePixelsWithBuffer = 1083

export const mapFases = mapSizePixels - 1

export const streamDepth = 10
