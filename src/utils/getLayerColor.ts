export function getSharpenLayerColor() {
  const mapbox = useMapbox()
  let rasterColorParams = []
  if (mapbox.value.settings.shrpFade === 0) {
    rasterColorParams = [
      'step',
      ['raster-value'],
      'rgba(54,22,0,0)',
      mapbox.value.settings.shrpThres,
      'rgba(54,22,0,0.5)',
    ]
  } else {
    rasterColorParams = [
      'step',
      ['raster-value'],
      'rgba(54,22,0,0)',
      mapbox.value.settings.shrpThres,
      'rgba(54,22,0,0)',
      mapbox.value.settings.shrpThres + mapbox.value.settings.shrpFade,
      'rgba(54,22,0,0.5)',
    ]
  }
  return rasterColorParams as any
}

export function getSmoothLayerColor() {
  const mapbox = useMapbox()
  let rasterColorParams = []
  if (mapbox.value.settings.smthFade === 0) {
    rasterColorParams = [
      'step',
      ['raster-value'],
      'rgba(10,142,65,0.5)',
      mapbox.value.settings.smthThres,
      'rgba(10,142,65,0.0)',
    ]
  } else {
    rasterColorParams = [
      'step',
      ['raster-value'],
      'rgba(10,142,65,0.5)',
      mapbox.value.settings.smthThres - mapbox.value.settings.smthFade,
      'rgba(10,142,65,0.5)',
      mapbox.value.settings.smthThres,
      'rgba(10,142,65,0)',
    ]
  }
  return rasterColorParams as any
}
