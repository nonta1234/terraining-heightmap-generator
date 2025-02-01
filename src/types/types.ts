import { z } from 'zod'
import type { Map, LngLatLike } from 'mapbox-gl'
import type { FeatureCollection, Feature, Polygon, GeoJsonProperties, MultiPolygon, MultiLineString } from 'geojson'

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

const depthPointSchema = z.object({
  x: z.number(),
  y: z.number(),
  depth: z.number(),
})

export type LngLat = Extract<LngLatLike, [number, number]>
export type HeightCalcType = 'manual' | 'limit' | 'maximize'
export type Interpolation = 'bilinear' | 'bicubic'
export type MapType = 'cs1' | 'cs2' | 'cs2play' | 'unity' | 'ue' | 'ocean'
export type StyleType = Record<'label' | 'value' | 'before' | 'grid' | 'alpha', string>

export type DepthPoint = {
  x: number
  y: number
  depth: number
}

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
  topleft: { Longitude: number, Latitude: number }
  topright: { Longitude: number, Latitude: number }
  bottomleft: { Longitude: number, Latitude: number }
  bottomright: { Longitude: number, Latitude: number }
  sides: {
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
  build: z.number(),
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
  riparian: z.number(),
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
  noiseThres: z.number(),
  displayEffectArea: z.boolean(),
  applyEffectAmount: z.boolean(),
  normalizePreview: z.boolean(),
  originalPreview: z.boolean(),
  useMapbox: z.boolean(),
  accessToken: z.string().optional(),
  accessTokenMT: z.string().optional(),
  depthPoints: z.array(depthPointSchema),
  subdivision: z.boolean(),
  subdivisionCount: z.number(),
  kernelNumber: z.number(),
})

export type Settings = z.infer<typeof settingsSchema>

export interface Mapbox {
  map: Map | undefined
  grid: Grid | undefined
  settings: Settings
  isUpdating: boolean
}

export type GenerateMapOption = {
  mapType?: MapType
  mode?: 'preview' | 'download'
  settings?: Settings
  resolution?: number
  isDebug?: boolean
}

export type MapOption = {
  settings: Settings
  mapPixels: number
  rasterPixels: number
  unitSize: number
  smoothRadius: number
  sharpenRadius: number
  division: number
  isDebug: boolean
}

export type SingleMapOption = MapOption & {
  rasterExtent: Extent
  vectorExtent: Extent
  oceanExtent: Extent
}

export type MultiMapOption = MapOption & {
  rasterExtents: Extent[]
  vectorExtents: Extent[]
  oceanExtents: Extent[]
}

export interface MapData {
  heightmap?: Float32Array
  waterMap?: Float32Array
  waterWayMap?: Float32Array
  blurredMap?: Float32Array
  sharpenMap?: Float32Array
  noisedMap?: Float32Array
  waterMapImage?: ImageBitmap
  waterWayMapImage?: ImageBitmap
}

export type ProgressData = {
  type: string
  data?: number | string
}

export type Canvases = {
  osTileCanvas: OffscreenCanvas
  osWaterCanvas: OffscreenCanvas
  osWaterWayCanvas: OffscreenCanvas
  osLittCanvas: OffscreenCanvas
  osCornerCanvas: OffscreenCanvas
}

export type OptionItem = {
  type?: 'header' | 'divide'
  value?: string | number
  label?: string
}

export type Extent = {
  topleft: { x: number, y: number }
  topright: { x: number, y: number }
  bottomleft: { x: number, y: number }
  bottomright: { x: number, y: number }
  centerX: number
  centerY: number
}

export type ResultType = {
  heightmap: Float32Array
  worldMap?: Float32Array
  waterMapImage?: ImageBitmap
  waterWayMapImage?: ImageBitmap
  min: number
  max: number
}

export type FileType = {
  heightmap: Blob | Uint8Array
  worldMap?: Blob | Uint8Array
}
