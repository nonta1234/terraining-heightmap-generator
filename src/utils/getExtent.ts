import * as turf from '@turf/turf'
import type { Extent } from '~/types/types'
import { lng2pixel, lat2pixel, pixel2lat, pixel2lng } from '~/utils/tiles'

export const rotateExtent = (extent: Extent, angle: number, centerX: number, centerY: number): Extent => {
  const cosTheta = Math.cos(-angle * Math.PI / 180)
  const sinTheta = Math.sin(-angle * Math.PI / 180)

  const _offset = ({ x, y }: { x: number, y: number }) => {
    return { x: x - centerX, y: y - centerY }
  }

  const _rotate = ({ x, y }: { x: number, y: number }) => {
    return {
      x: (x * cosTheta + y * sinTheta) + centerX,
      y: (y * cosTheta - x * sinTheta) + centerY,
    }
  }

  const offsetTopleft = _offset(extent.topleft)
  const offsetTopright = _offset(extent.topright)
  const offsetBottomleft = _offset(extent.bottomleft)
  const offsetBottomright = _offset(extent.bottomright)
  const offsetCX = extent.centerX - centerX
  const offsetCY = extent.centerY - centerY

  const resultTopleft = _rotate(offsetTopleft)
  const resultTopright = _rotate(offsetTopright)
  const resultBottomleft = _rotate(offsetBottomleft)
  const resultBottomright = _rotate(offsetBottomright)
  const resultCX = (offsetCX * cosTheta + offsetCY * sinTheta) + centerX
  const resultCY = (offsetCY * cosTheta - offsetCX * sinTheta) + centerY

  return {
    topleft: resultTopleft,
    topright: resultTopright,
    bottomleft: resultBottomleft,
    bottomright: resultBottomright,
    centerX: resultCX,
    centerY: resultCY,
  }
}

/**
 * Returns the coordinates of each point in any km square.
 * @param lng Center longitude
 * @param lat Center latitude
 * @param size km
 * @param offset Inward offset (0 - 0.5)
 * @returns Coordinate of each point
 */
export const getExtent = (lng: number, lat: number, size: number, offset = 0) => {
  const x = lng2pixel(lng, 0)
  const y = lat2pixel(lat, 0)
  const _offset = Math.min(Math.max(offset, 0), 0.5)

  const buffer = turf.buffer(
    turf.point([lng, lat]),
    size / 2,
    { units: 'kilometers' },
  )

  const _north = buffer.geometry.coordinates[0][8][1]
  const _south = buffer.geometry.coordinates[0][24][1]
  const _east = buffer.geometry.coordinates[0][0][0]
  const _west = buffer.geometry.coordinates[0][16][0]

  const width = lng2pixel(_east, 0) + (_east > _west ? 0 : 256) - lng2pixel(_west, 0)
  const height = lat2pixel(_south, 0) - lat2pixel(_north, 0)

  // Calculate the length of the side of the square with the least error.
  const side = Math.sqrt(width * width + height * height) / Math.SQRT2
  const halfSide = side / 2
  const offsetPixels = side * _offset

  const north = pixel2lat(y - halfSide + offsetPixels, 0)
  const south = pixel2lat(y + halfSide - offsetPixels, 0)
  const east = pixel2lng(x + halfSide - offsetPixels, 0)
  const west = pixel2lng(x - halfSide + offsetPixels, 0)

  return {
    topleft: [west, north] as turf.helpers.Position,
    topright: [east, north] as turf.helpers.Position,
    bottomleft: [west, south] as turf.helpers.Position,
    bottomright: [east, south] as turf.helpers.Position,
    minX: west,
    minY: south,
    maxX: east,
    maxY: north,
  }
}

/**
 * Returns the world pixel coordinates of each side in any km square.
 * @param lng Center longitude
 * @param lat Center latitude
 * @param size km
 * @param offset Inward offset (0 - 0.5)
 * @param pixelsPerTile default 256, Mapbox Terrain-DEM v1 \@2x is 512
 * @returns World pixel coordinates
 */
export const getExtentInWorldCoords = (lng: number, lat: number, size: number, offset = 0, pixelsPerTile = 256): Extent => {
  const centerX = lng2pixel(lng, 0, pixelsPerTile)
  const centerY = lat2pixel(lat, 0, pixelsPerTile)
  const _offset = Math.min(Math.max(offset, 0), 0.5)

  const buffer = turf.buffer(
    turf.point([lng, lat]),
    size / 2,
    { units: 'kilometers' },
  )

  const _north = buffer.geometry.coordinates[0][8][1]
  const _south = buffer.geometry.coordinates[0][24][1]
  const _east = buffer.geometry.coordinates[0][0][0]
  const _west = buffer.geometry.coordinates[0][16][0]

  const width = lng2pixel(_east, 0, pixelsPerTile) + (_east > _west ? 0 : pixelsPerTile) - lng2pixel(_west, 0, pixelsPerTile)
  const height = lat2pixel(_south, 0, pixelsPerTile) - lat2pixel(_north, 0, pixelsPerTile)

  // Calculate the length of the side of the square with the least error.
  const side = Math.sqrt(width * width + height * height) / Math.SQRT2
  const halfSide = side / 2
  const offsetPixels = side * _offset

  const x0 = centerX - halfSide + offsetPixels
  const x1 = centerX + halfSide - offsetPixels
  const y0 = centerY - halfSide + offsetPixels
  const y1 = centerY + halfSide - offsetPixels

  return {
    topleft: { x: x0, y: y0 },
    topright: { x: x1, y: y0 },
    bottomleft: { x: x0, y: y1 },
    bottomright: { x: x1, y: y1 },
    centerX,
    centerY,
  }
}
