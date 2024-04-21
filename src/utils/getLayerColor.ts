import type { Expression } from 'mapbox-gl'

export function getSharpenLayerColor() {
  const mapbox = useMapbox()
  if (mapbox.value.settings.shrpFade === 0) {
    return [
      'step',
      ['raster-value'],
      'rgba(54,22,0,0)',
      mapbox.value.settings.shrpThres,
      'rgba(54,22,0,1)',
    ] as Expression
  } else {
    return [
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
    ] as Expression
  }
}

export function getSmoothLayerColor() {
  const mapbox = useMapbox()
  if (mapbox.value.settings.smthFade === 0) {
    return [
      'step',
      ['raster-value'],
      'rgba(10,142,65,1)',
      mapbox.value.settings.smthThres,
      'rgba(10,142,65,0.0)',
    ] as Expression
  } else {
    return  [
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
    ] as Expression
  }
}

export const getRasterOpacity = (value: number) => {
  const mapbox = useMapbox()
  if (mapbox.value.settings.applyEffectAmount) {
    return Math.sqrt(value / 100) * 0.7
  } else {
    return 0.5
  }
}
