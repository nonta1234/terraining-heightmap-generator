import type { GridInfo, LittoralArray, Settings, StyleList } from '~/types/types'

export const NEED_TOKEN = 'You will need your own Mapbox access token\nto download the heightmap data for CS2.'

export const mapStyle = {
  streets:    'mapbox://styles/mapbox/streets-v12?optimize=true',
  outdoors:   'mapbox://styles/mapbox/outdoors-v12?optimize=true',
  light:      'mapbox://styles/mapbox/light-v11?optimize=true',
  dark:       'mapbox://styles/mapbox/dark-v11?optimize=true',
  satellite:  'mapbox://styles/mapbox/satellite-v9?optimize=true',
  satStreets: 'mapbox://styles/mapbox/satellite-streets-v12?optimize=true',
}

export const styleList: StyleList = {
  'Mapbox Streets': { text: 'Streets', value: 'streets-v12', before: 'pitch-outline', grid: 'black', alpha: '0.2' },
  'Mapbox Outdoors': { text: 'Outdoors', value: 'outdoors-v12', before: 'pitch-outline', grid: 'black', alpha: '0.2' },
  'Mapbox Light': { text: 'Light', value: 'light-v11', before: 'waterway', grid: 'black', alpha: '0.2' },
  'Mapbox Dark': { text: 'Dark', value: 'dark-v11', before: 'waterway', grid: 'gray', alpha: '0.2' },
  'Mapbox Satellite': { text: 'Satellite', value: 'satellite-v9', before: '', grid: 'white', alpha: '0.4' },
  'Mapbox Satellite Streets': { text: 'Sat. Streets', value: 'satellite-streets-v12', before: '', grid: 'white', alpha: '0.4' },
}

export const mapSpec: GridInfo = {
  cs1: {
    mapPixels: 1081,
    mapFaces: 1080,
    size: 17.280,
    cell: 9,
    center: [40, 40, 40, 40],
    play: [20, 24, 60, 56],
    rotate: [
      [0, 0, 0, 0],
      [8, 8, 8, 8],
      [80, 80, 80, 80],
      [72, 72, 72, 72],
    ],
    side: [0, 8, 80, 72],
  },
  cs2: {
    mapPixels: 4096,
    mapFaces: 4096,
    size: 57.344,
    cell: 24,
    center: [275, 276, 300, 299],
    play: [225, 230, 350, 345],
    rotate: [
      [0, 1, 25, 24],
      [22, 23, 47, 46],
      [550, 551, 575, 574],
      [528, 529, 553, 552],
    ],
    side: [0, 23, 575, 552],
  },
  cs2play: {
    mapPixels: 4096,
    mapFaces: 4096,
    size: 57.344,
    cell: 24,
    center: [275, 276, 300, 299],
    play: [225, 230, 350, 345],
    rotate: [
      [0, 1, 25, 24],
      [22, 23, 47, 46],
      [550, 551, 575, 574],
      [528, 529, 553, 552],
    ],
    side: [0, 23, 575, 552],
  },
}

export const littoralArray: LittoralArray = {
  linear: [0.084, 0.188, 0.292, 0.396, 0.500, 0.604, 0.708, 0.812, 0.916],
  sine:   [0.024, 0.095, 0.206, 0.345, 0.500, 0.655, 0.794, 0.905, 0.976],
  cubic:  [0.004, 0.032, 0.108, 0.256, 0.500, 0.744, 0.892, 0.968, 0.996],
  quint:  [0.001, 0.005, 0.039, 0.164, 0.500, 0.836, 0.961, 0.995, 0.999],
}

export const effectRasterColorRange: [number, number] = [-500, 9740]

export const effectRasterColorMix: [number, number, number, number]  = [
  256 * 256 * 256 * 0.1,
  256 * 256 * 0.1,
  256 * 0.1,
  -10030,
]

export const initialValue: Settings = {
  lng:               -73.96530,
  lat:               40.78280,
  zoom:              10,
  size:              17.280,
  angle:             0,
  seaLevel:          0,
  adjLevel:          false,
  vertScale:         1.00,
  fixedRatio:        true,
  type:              'manual',
  depth:             40,
  waterside:         '1',
  streamDepth:       0,
  littoral:          160,
  littArray:         littoralArray.sine,
  smoothing:         0,
  smthThres:         0,
  smthFade:          0,
  smoothCount:       1,
  sharpen:           0,
  shrpThres:         0,
  shrpFade:          0,
  style:             mapStyle.outdoors,
  userStyleURL:      '',
  gridInfo:          'cs1',
  elevationScale:    4096.000,
  interpolation:     'bicubic',
  noise:             0,
  noiseGrid:         10,
  displayEffectArea: false,
  applyEffectAmount: false,
  accessToken:       '',
}
