import * as turf from '@turf/turf'

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


export const getExtentInWorldPixel = (lng: number, lat: number, size: number, offset = 0) => {
  const centerX = lng2pixel(lng, 0, 512)
  const centerY = lat2pixel(lat, 0, 512)
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

  const width = lng2pixel(_east, 0, 512) + (_east > _west ? 0 : 512) - lng2pixel(_west, 0, 512)
  const height = lat2pixel(_south, 0, 512) - lat2pixel(_north, 0, 512)
  const side = Math.sqrt(width * width + height * height) / Math.SQRT2
  const halfSide = side / 2
  const offsetPixels = side * _offset

  const x0 = centerX - halfSide + offsetPixels
  const x1 = centerX + halfSide - offsetPixels
  const y0 = centerY - halfSide + offsetPixels
  const y1 = centerY + halfSide - offsetPixels

  return { x0, y0, x1, y1 }
}
