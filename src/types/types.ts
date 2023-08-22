import { Map, LngLatLike } from 'mapbox-gl'
import { FeatureCollection, Feature, Polygon, GeoJsonProperties, MultiPoint, MultiLineString } from 'geojson'

export type LngLat = Extract<LngLatLike, [number, number]>;

export type HeightCalcType = 'manual' | 'limit' | 'maximize';

export interface Grid {
  gridArea:     FeatureCollection<Polygon, GeoJsonProperties>;
  playArea:     Feature<Polygon, GeoJsonProperties>;
  centerArea:   Feature<Polygon, GeoJsonProperties>;
  cornerPoints: Feature<MultiPoint, GeoJsonProperties>;
  sideLines:    Feature<MultiLineString, GeoJsonProperties>;
}

export interface Settings {
  lng:        number;
  lat:        number;
  zoom:       number;
  size:       number;
  angle:      number;
  seaLevel:   number;
  adjLevel:   boolean;
  vertScale:  number;
  fixedRatio: boolean,
  type:       HeightCalcType,
  depth:      number;
  littoral:   number;
  littArray:  number[];
  smoothing:  number;
  smthThres:  number;
  smthFade:   number;
  sharpen:    number;
  shrpThres:  number;
  shrpFade:   number;
}

export interface Mapbox {
  map:        Map | undefined;
  grid:       Grid | undefined;
  settings:   Settings;
  isUpdating: boolean,
}
