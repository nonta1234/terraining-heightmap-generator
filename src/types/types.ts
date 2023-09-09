import { Map, LngLatLike } from 'mapbox-gl'
import { FeatureCollection, Feature, Polygon, GeoJsonProperties, MultiPolygon, MultiLineString } from 'geojson'


export type LngLat = Extract<LngLatLike, [number, number]>;

export type HeightCalcType = 'manual' | 'limit' | 'maximize';

export type Interpolation = 'bilinear' | 'bicubic';

export type GridInfoData = {
  mapPixels: number
  size:      number
  cell:      number
  playCell:  number
}

export interface GridInfo {
  [index: string]: GridInfoData;
}

export interface LittoralArray {
  [index: string]: number[];
}

export interface Grid {
  gridArea:     FeatureCollection<Polygon, GeoJsonProperties>;
  playArea:     Feature<Polygon, GeoJsonProperties>;
  centerArea:   Feature<Polygon, GeoJsonProperties>;
  rotateArea:   Feature<MultiPolygon, GeoJsonProperties>;
  sideLines:    Feature<MultiLineString, GeoJsonProperties>;
  direction:    Feature<MultiLineString, GeoJsonProperties>;
}

export interface Settings {
  lng:           number;
  lat:           number;
  zoom:          number;
  size:          number;
  angle:         number;
  seaLevel:      number;
  adjLevel:      boolean;
  vertScale:     number;
  fixedRatio:    boolean,
  type:          HeightCalcType,
  depth:         number;
  littoral:      number;
  littArray:     number[];
  smoothing:     number;
  smthThres:     number;
  smthFade:      number;
  sharpen:       number;
  shrpThres:     number;
  shrpFade:      number;
  gridInfo:      string;
  interpolation: Interpolation;
}

export interface Mapbox {
  map:        Map | undefined;
  grid:       Grid | undefined;
  settings:   Settings;
  isUpdating: boolean,
}
