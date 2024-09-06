import { z } from 'zod'
import type { Map, LngLatLike } from 'mapbox-gl'
import type { FeatureCollection, Feature, Polygon, GeoJsonProperties, MultiPolygon, MultiLineString, Position } from 'geojson'

const heightCalcTypeSchema = z.union([
  z.literal('manual'),
  z.literal('limit'),
  z.literal('maximize'),
])

const interpolationSchema = z.union([
  z.literal('bilinear'),
  z.literal('bicubic'),
])

const mapTypeSchema = z.union([
  z.literal('cs1'),
  z.literal('cs2'),
  z.literal('cs2play'),
  z.literal('unity'),
  z.literal('ue'),
  z.literal('ocean'),
])

export type LngLat = Extract<LngLatLike, [number, number]>
export type HeightCalcType = 'manual' | 'limit' | 'maximize'
export type Interpolation = 'bilinear' | 'bicubic'
export type MapType = 'cs1' | 'cs2' | 'cs2play' | 'unity' | 'ue' | 'ocean'
export type StyleType = Record<'text' | 'value' | 'before' | 'grid' | 'alpha', string>

export const viewModes = ['height', 'world'] as const
export type ViewMode = typeof viewModes[number]

export type StyleList = {
  [index: string]: StyleType
}

export type GridSpec = {
  cell: number
  center: number[]
  play: number[] | undefined
  rotate: number[][]
  side: number[]
}

export type MapSpec = {
  name: string
  defaultSize: number | undefined
  defaultRes: number
  defaultEs: number
  resolutions: number[]
  correction: 0 | 1
  grid: GridSpec
}

export interface MapSpecs {
  [index: string]: MapSpec
}

export type GridPositions = {
  topleft: Position
  topright: Position
  bottomleft: Position
  bottomright: Position
  _sides: {
    north: number
    south: number
    east: number
    west: number
  }
}

export interface LittoralArray {
  [index: string]: number[]
}

export interface Grid {
  gridArea: FeatureCollection<Polygon, GeoJsonProperties>
  playArea: Feature<Polygon, GeoJsonProperties> | undefined
  centerArea: Feature<Polygon, GeoJsonProperties>
  rotateArea: Feature<MultiPolygon, GeoJsonProperties>
  sideLines: Feature<MultiLineString, GeoJsonProperties>
  direction: Feature<MultiLineString, GeoJsonProperties>
}

export const settingsSchema = z.object({
  lng: z.number(),
  lat: z.number(),
  zoom: z.number(),
  size: z.number(),
  resolution: z.number(),
  worldPartition: z.boolean(),
  wpCells: z.number(),
  angle: z.number(),
  baseLevel: z.number(),
  adjToMin: z.boolean(),
  vertScale: z.number(),
  fixedRatio: z.boolean(),
  type: heightCalcTypeSchema,
  depth: z.number(),
  waterside: z.number(),
  streamDepth: z.number(),
  streamWidth: z.number(),
  littoral: z.number(),
  littArray: z.array(z.number()),
  actualSeafloor: z.boolean(),
  smoothing: z.number(),
  smoothRadius: z.number(),
  smthThres: z.number(),
  smthFade: z.number(),
  sharpen: z.number(),
  sharpenRadius: z.number(),
  shrpThres: z.number(),
  shrpFade: z.number(),
  style: z.string(),
  userStyleURL: z.string().optional(),
  gridInfo: mapTypeSchema,
  elevationScale: z.number(),
  interpolation: interpolationSchema,
  noise: z.number(),
  noiseGrid: z.number(),
  displayEffectArea: z.boolean(),
  applyEffectAmount: z.boolean(),
  normalizePreview: z.boolean(),
  originalPreview: z.boolean(),
  useMapbox: z.boolean(),
  accessToken: z.string().optional(),
  accessTokenMT: z.string().optional(),
})

export type Settings = z.infer<typeof settingsSchema>

export interface Mapbox {
  map: Map | undefined
  grid: Grid | undefined
  settings: Settings
  isUpdating: boolean
}

export type GenerateMapOption = {
  mapType: MapType
  settings: Settings
  includeOcean?: boolean
  isDebug?: boolean
  resolution?: number
}

export type Canvases = {
  osTileCanvas: OffscreenCanvas
  osWaterCanvas: OffscreenCanvas
  osWaterWayCanvas: OffscreenCanvas
  osLittCanvas: OffscreenCanvas
  osCornerCanvas: OffscreenCanvas
}
