export function getSharpenLayerColor() {
  const mapbox = useMapbox()
  let lineColorParams = []
  if (mapbox.value.settings.shrpFade === 0) {
    lineColorParams = [
      'step',
      ['get', 'ele'],
      'hsla(34, 86%, 17%, 0)',
      mapbox.value.settings.shrpThres,
      'hsl(34, 86%, 17%)',
    ]
  } else {
    lineColorParams = [
      'step',
      ['get', 'ele'],
      'hsla(34, 86%, 17%, 0)',
      mapbox.value.settings.shrpThres,
      [
        'interpolate',
        ['linear'],
        ['get', 'ele'],
        mapbox.value.settings.shrpThres,
        'hsla(34, 86%, 17%, 0)',
        mapbox.value.settings.shrpThres + mapbox.value.settings.shrpFade,
        'hsl(34, 86%, 17%)',
      ],
      mapbox.value.settings.shrpThres + mapbox.value.settings.shrpFade,
      'hsl(34, 86%, 17%)',
    ]
  }
  return lineColorParams as mapboxgl.StyleFunction
}

export function getSmoothLayerColor() {
  const mapbox = useMapbox()
  let lineColorParams = []
  if (mapbox.value.settings.smthFade === 0) {
    lineColorParams = [
      'step',
      ['get', 'ele'],
      'hsl(87, 85%, 49%)',
      mapbox.value.settings.smthThres,
      'hsl(145, 86%, 30%)',
    ]
  } else {
    lineColorParams = [
      'step',
      ['get', 'ele'],
      'hsl(87, 85%, 49%)',
      mapbox.value.settings.smthThres - mapbox.value.settings.smthFade,
      [
        'interpolate',
        ['linear'],
        ['get', 'ele'],
        mapbox.value.settings.smthThres - mapbox.value.settings.smthFade,
        'hsl(87, 85%, 49%)',
        mapbox.value.settings.smthThres,
        'hsl(145, 86%, 30%)',
      ],
      mapbox.value.settings.smthThres,
      'hsl(145, 86%, 30%)',
    ]
  }
  return lineColorParams as mapboxgl.StyleFunction
}
