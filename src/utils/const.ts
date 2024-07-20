import type { LittoralArray, Settings, StyleList, GridSpec, MapSpecs } from '~/types/types'

export const NEED_TOKEN = 'You will need your own Mapbox access token\nto download the heightmap data for'
export const ATTR = '\u00A9 Mapbox \u00A9 OpenStreetMap'
export const ATTR_RAS = '\u00A9 Maxar \u00A9 Mapbox \u00A9 OpenStreetMap'

export const mapStyle = {
  streets:    'mapbox://styles/mapbox/streets-v12?optimize=true',
  outdoors:   'mapbox://styles/mapbox/outdoors-v12?optimize=true',
  light:      'mapbox://styles/mapbox/light-v11?optimize=true',
  dark:       'mapbox://styles/mapbox/dark-v11?optimize=true',
  satellite:  'mapbox://styles/mapbox/satellite-v9?optimize=true',
  satStreets: 'mapbox://styles/mapbox/satellite-streets-v12?optimize=true',
}

export const styleList: StyleList = {
  'Mapbox Streets': { text: 'Streets', value: 'mapbox/streets-v12', before: 'pitch-outline', grid: 'black', alpha: '0.2' },
  'Mapbox Outdoors': { text: 'Outdoors', value: 'mapbox/outdoors-v12', before: 'pitch-outline', grid: 'black', alpha: '0.2' },
  'Mapbox Light': { text: 'Light', value: 'mapbox/light-v11', before: 'waterway', grid: 'black', alpha: '0.2' },
  'Mapbox Dark': { text: 'Dark', value: 'mapbox/dark-v11', before: 'waterway', grid: 'gray', alpha: '0.2' },
  'Mapbox Satellite': { text: 'Satellite', value: 'mapbox/satellite-v9', before: '', grid: 'white', alpha: '0.4' },
  'Mapbox Satellite Streets': { text: 'Sat. Streets', value: 'mapbox/satellite-streets-v12', before: '', grid: 'white', alpha: '0.4' },
}

const gridCs1: GridSpec = {
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
}

const gridCs2: GridSpec = {
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
}

const gridEngine: GridSpec = {
  cell: 8,
  center: [27, 28, 36, 35],
  play: undefined,
  rotate: [
    [0, 0, 0, 0],
    [7, 7, 7, 7],
    [63, 63, 63, 63],
    [56, 56, 56, 56],
  ],
  side: [0, 7, 63, 56],
}

/**
 * Only CS2 has special handling.
 * CS2 needs to generate two heightmaps (heightmap, worldmap) and uses options for that.
 * Also, the origin of the elevation data is probably centered (others are top-left).
 * For that purpose, we use correction values.
 * This variable can be extended once the map specification is known.
 */
export const mapSpec: MapSpecs = {
  cs1: {
    name: 'CS1',
    defaultSize: 17.280,
    defaultRes: 1081,
    defaultEs: 1024 / 65536 * 65535,
    resolutions: [1081],
    correction: 1,
    grid: gridCs1,
  },
  cs2: {
    name: 'CS2',
    defaultSize: 57.344,
    defaultRes: 4096,
    defaultEs: 4096,
    resolutions: [4096],
    correction: 0,
    grid: gridCs2,
  },
  cs2play: {
    name: 'CS2',
    defaultSize: 57.344,
    defaultRes: 4096,
    defaultEs: 4096,
    resolutions: [4096],
    correction: 0,
    grid: gridCs2,
  },
  unity: {
    name: 'Unity',
    defaultSize: undefined,
    defaultRes: 513,
    defaultEs: 4096,
    resolutions: [33, 65, 129, 257, 513, 1025, 2049, 4097],
    correction: 1,
    grid: gridEngine,
  },
  ue: {
    name: 'UE',
    defaultSize: undefined,
    defaultRes: 505,
    defaultEs: 4096,
    resolutions: [127, 253, 505, 1009, 2017, 4033, 8129],
    correction: 1,
    grid: gridEngine,
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
  resolution:        1081,
  worldPartition:    false,
  wpCells:           1,
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

export const needToken = (type: string) => {
  return `${NEED_TOKEN} ${mapSpec[type].name}.`
}
