export const lng2tile = (lng: number, zoom: number) => {
  return Math.floor((lng + 180) / 360 * Math.pow(2, zoom))
}
export const lat2tile = (lat: number, zoom: number) => {
  return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))
}

export const tile2lng = (x: number, zoom: number) => {
  return x / Math.pow(2, zoom) * 360 - 180
}

export const tile2lat = (y: number, zoom: number) => {
  const n = Math.PI - 2 * Math.PI * y / Math.pow(2, zoom)
  return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}

export const lng2pixel = (lng: number, zoom: number, pixelsPerTile: number) => {
  return Math.pow(2, zoom + Math.log2(pixelsPerTile / 2)) * (lng / 180 + 1)
}

export const lat2pixel = (lat: number, zoom: number, pixelsPerTile: number) => {
  return (Math.pow(2, zoom + Math.log2(pixelsPerTile / 2)) / Math.PI) *
    (Math.atanh(Math.sin(Math.PI * 85.05112878 / 180)) - Math.atanh(Math.sin(Math.PI * lat / 180)))
}

export const pixel2tile = (x: number, pixelsPerTile: number) => {
  return Math.floor(x / pixelsPerTile)
}


// C = 40075016.686m ≈ 2π * 6378.137km
// rad = lat * π / 180
// pxLength(km) * mapPixel = C * cos(rad) / 2 ^ zoom / pixelPerTile * mapPixel = mapLength
// zoom = ln((2π * 6378.137 * mapPixel * cos(rad)) / (mapLength * pixelPerTile)) / ln(2)

export const calculateZoomLevel = (lat: number, mapSize: number, requiredPixels: number, pixelsPerTile: number) => {
  return Math.log2((2 * Math.PI * 6378.137 * requiredPixels * Math.cos(lat * Math.PI / 180)) / (mapSize * pixelsPerTile))
}

export const getBoundsLngLat = (size: number) => {
  const mapbox = useMapbox()
  const bounds = getExtent(mapbox.value.settings.lng, mapbox.value.settings.lat, size / 2, size / 2)
  const minLng = Math.min(bounds.topleft[0], bounds.bottomright[0])
  const minLat = Math.min(bounds.topleft[1], bounds.bottomright[1])
  const maxLng = Math.max(bounds.topleft[0], bounds.bottomright[0])
  const maxLat = Math.max(bounds.topleft[1], bounds.bottomright[1])

  return { minLng, minLat, maxLng, maxLat }
}
