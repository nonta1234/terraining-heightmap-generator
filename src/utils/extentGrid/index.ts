import booleanIntersects from '@turf/boolean-intersects'
import type {
  FeatureCollection,
  Polygon,
  BBox,
  Feature,
  MultiPolygon,
  GeoJsonProperties,
} from 'geojson'
import { featureCollection, polygon } from '@turf/helpers'


function extentGrid<P extends GeoJsonProperties = GeoJsonProperties>(
  bbox: BBox,
  cells: number,
  options: {
    properties?: P;
    mask?: Feature<Polygon | MultiPolygon> | Polygon | MultiPolygon;
  } = {},
): FeatureCollection<Polygon, P> {
  return rectangleGrid(bbox, cells, cells, options)
}


function rectangleGrid<P extends GeoJsonProperties = GeoJsonProperties>(
  bbox: BBox,
  columns: number,
  rows: number,
  options: {
    properties?: P;
    mask?: Feature<Polygon | MultiPolygon> | Polygon | MultiPolygon;
  } = {},
): FeatureCollection<Polygon, P> {
  // Containers
  const results = []
  const west = bbox[0]
  const south = bbox[1]
  const east = bbox[2]
  const north = bbox[3]

  const bboxWidth = east - west
  const bboxHeight = north - south

  const cellWidthDeg = bboxWidth / columns
  const cellHeightDeg = bboxHeight / rows

  // iterate over columns & rows
  let currentX = west
  for (let column = 0; column < columns; column++) {
    let currentY = south
    for (let row = 0; row < rows; row++) {
      const cellPoly = polygon(
        [
          [
            [currentX, currentY],
            [currentX, currentY + cellHeightDeg],
            [currentX + cellWidthDeg, currentY + cellHeightDeg],
            [currentX + cellWidthDeg, currentY],
            [currentX, currentY],
          ],
        ],
        options.properties,
      )
      if (options.mask) {
        if (booleanIntersects(options.mask, cellPoly)) {
          results.push(cellPoly)
        }
      } else {
        results.push(cellPoly)
      }

      currentY += cellHeightDeg
    }
    currentX += cellWidthDeg
  }
  return featureCollection(results)
}


export { extentGrid }
export default extentGrid
