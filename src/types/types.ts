import { Map, type LngLatLike } from 'mapbox-gl'
import type { FeatureCollection, Feature, Polygon, GeoJsonProperties, MultiPolygon, MultiLineString } from 'geojson'

export type LngLat = Extract<LngLatLike, [number, number]>;
export type HeightCalcType = 'manual' | 'limit' | 'maximize';
export type Interpolation = 'bilinear' | 'bicubic';
export type MapType = 'cs1' | 'cs2' | 'cs2play';
export type StyleType = Record<'text' | 'value' | 'before' | 'grid' | 'alpha', string>;

export type StyleList = {
  [index: string]: StyleType;
}

export type GridInfoData = {
  mapPixels: number;
  mapFaces:  number;
  size:      number;
  cell:      number;
  center:    number[];
  play:      number[];
  rotate:    number[][];
  side:      number[];
}

export interface GridInfo {
  [index: string]: GridInfoData;
}

export interface LittoralArray {
  [index: string]: number[];
}

export interface Grid {
  gridArea:   FeatureCollection<Polygon, GeoJsonProperties>;
  playArea:   Feature<Polygon, GeoJsonProperties>;
  centerArea: Feature<Polygon, GeoJsonProperties>;
  rotateArea: Feature<MultiPolygon, GeoJsonProperties>;
  sideLines:  Feature<MultiLineString, GeoJsonProperties>;
  direction:  Feature<MultiLineString, GeoJsonProperties>;
}

export interface Settings {
  lng:               number;
  lat:               number;
  zoom:              number;
  size:              number;
  angle:             number;
  seaLevel:          number;
  adjLevel:          boolean;
  vertScale:         number;
  fixedRatio:        boolean;
  type:              HeightCalcType;
  depth:             number;
  streamDepth:       number;
  littoral:          number;
  littArray:         number[];
  smoothing:         number;
  smthThres:         number;
  smthFade:          number;
  smoothCount:       number;
  sharpen:           number;
  shrpThres:         number;
  shrpFade:          number;
  gridInfo:          MapType;
  elevationScale:    number;
  interpolation:     Interpolation;
  noise:             number;
  noiseGrid:         number;
  displayEffectArea: boolean,
  applyEffectAmount: boolean,
  accessToken:       string,
}

export interface Mapbox {
  map:        Map | undefined;
  grid:       Grid | undefined;
  settings:   Settings;
  isUpdating: boolean,
}

export type GenerateMapOption = {
  mapType:      MapType;
  settings:     Settings;
  token:        string;
  scaleFactor?: number;
}

export type Canvases = {
  tileCanvas:   OffscreenCanvas;
  waterCanvas:  OffscreenCanvas;
  littCanvas:   OffscreenCanvas;
  cornerCanvas: OffscreenCanvas;
}
