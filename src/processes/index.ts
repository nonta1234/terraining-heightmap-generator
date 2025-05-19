// getTileData is not managed by the worker-pool and is called directly from GetCitiesMapWorker

import { applyEffects } from './applyEffects'
import { blendMapsWithFeathering } from './blendMapsWithFeathering'
import { combineMap } from './combineMap'
import { extractMap, extractMapCS2 } from './extractMap'
// import { getTileData } from './getTileData'
import { lanczosSeparably } from './lanczosSeparably'
import { mergeTiles } from './mergeTiles'
import { scaleDownWorldMap } from './scaleDownWorldMap'
import { scaleUpBicubic } from './scaleUpBicubic'
import { splitTile } from './splitTile'

export const processes = {
  applyEffects,
  blendMapsWithFeathering,
  combineMap,
  extractMap,
  extractMapCS2,
  // getTileData,
  lanczosSeparably,
  mergeTiles,
  scaleDownWorldMap,
  scaleUpBicubic,
  splitTile,
}

export type ProcessFunctions = typeof processes
