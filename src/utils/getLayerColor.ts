export function getSharpenLayerColor() {
  const mapbox = useMapbox()
  let rasterColorParams = []
  if (mapbox.value.settings.shrpFade === 0) {
    rasterColorParams = [
      'step',
      ['raster-value'],
      'rgba(54,22,0,0)',
      mapbox.value.settings.shrpThres,
      'rgba(54,22,0,1)',
    ]
  } else {
    rasterColorParams = [
      'step',
      ['raster-value'],
      'rgba(54,22,0,0)',
      mapbox.value.settings.shrpThres,
      [
        'interpolate',
        ['linear'],
        ['raster-value'],
        mapbox.value.settings.shrpThres,
        'rgba(54,22,0,0)',
        mapbox.value.settings.shrpThres + mapbox.value.settings.shrpFade,
        'rgba(54,22,0,1)',
      ],
      mapbox.value.settings.shrpThres + mapbox.value.settings.shrpFade,
      'rgba(54,22,0,1)',
    ]
  }
  return rasterColorParams as any   // RasterPaint type settings are in beta
}

export function getSmoothLayerColor() {
  const mapbox = useMapbox()
  let rasterColorParams = []
  if (mapbox.value.settings.smthFade === 0) {
    rasterColorParams = [
      'step',
      ['raster-value'],
      'rgba(10,142,65,1)',
      mapbox.value.settings.smthThres,
      'rgba(10,142,65,0.0)',
    ]
  } else {
    rasterColorParams = [
      'step',
      ['raster-value'],
      'rgba(10,142,65,1)',
      mapbox.value.settings.smthThres - mapbox.value.settings.smthFade,
      [
        'interpolate',
        ['linear'],
        ['raster-value'],
        mapbox.value.settings.smthThres - mapbox.value.settings.smthFade,
        'rgba(10,142,65,1)',
        mapbox.value.settings.smthThres,
        'rgba(10,142,65,0)',
      ],
      mapbox.value.settings.smthThres,
      'rgba(10,142,65,0)',
    ]
  }
  return rasterColorParams as any   // RasterPaint type settings are in beta
}

export const getRasterOpacity = (value: number) => {
  const mapbox = useMapbox()
  if (mapbox.value.settings.applyEffectAmount) {
    return Math.sqrt(value / 100) * 0.7
  } else {
    return 0.5
  }
}
