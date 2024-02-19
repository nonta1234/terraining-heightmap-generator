import * as turf from '@turf/turf'
import geojsontoosm from 'geojsontoosm'
import osm2geojson from 'osm2geojson-lite'
import booleanContains from '~/utils/contains'

export const getOsmMap = async () => {
  const mapbox = useMapbox()
  let url = ''
  let area: turf.FeatureCollection = turf.flatten(turf.bboxPolygon([0, 0, 0, 0]))

  if (mapbox.value.settings.angle === 0) {
    const { minX, minY, maxX, maxY } = getExtent(mapbox.value.settings.lng, mapbox.value.settings.lat, mapbox.value.settings.size)
    url = `https://overpass-api.de/api/map?bbox=${minX},${minY},${maxX},${maxY}`
  } else {
    const { minX: minX1, minY: minY1, maxX: maxX1, maxY: maxY1 } = getExtent(mapbox.value.settings.lng, mapbox.value.settings.lat, mapbox.value.settings.size * Math.SQRT2)
    url = `https://overpass-api.de/api/map?bbox=${minX1},${minY1},${maxX1},${maxY1}`
    const { minX, minY, maxX, maxY } = getExtent(mapbox.value.settings.lng, mapbox.value.settings.lat, mapbox.value.settings.size)
    area = turf.flatten(turf.bboxPolygon([minX, minY, maxX, maxY]))
  }

  const res = await fetch(url)
  if (res.ok) {
    const osm = await res.text()
    if (mapbox.value.settings.angle === 0) {
      return osm
    } else {
      const geojsonData = osm2geojson(osm, { completeFeature: true, allFeatures: true, renderTagged: true }) as turf.AllGeoJSON
      turf.transformRotate(geojsonData, mapbox.value.settings.angle, { pivot: [mapbox.value.settings.lng, mapbox.value.settings.lat], mutate: true })
      const clipedGeojson = clip(area, geojsonData)
      return geojsontoosm(clipedGeojson)
    }
  } else {
    throw new Error(`An error occurred in download osm data: ${res.status}`)
  }
}


function clip(clippingData: turf.AllGeoJSON, inputData: turf.AllGeoJSON) {
  const output: turf.FeatureCollection = {
    type: 'FeatureCollection',
    features: Array<turf.Feature>(),
  }

  const clippingFeatures = turf.flatten(clippingData).features
  const inputFeatures = turf.flatten(inputData).features

  for (let i = clippingFeatures.length - 1; i >= 0; i--) {
    const cGeo = clippingFeatures[i]
    for (let j = inputFeatures.length - 1; j >= 0; j--) {
      const iGeo = inputFeatures[j]

      try {
        if (booleanContains(cGeo, iGeo)) {
          output.features.push(iGeo)
        } else if (booleanContains(iGeo, cGeo)) {
          cGeo.properties = iGeo.properties
          output.features.push(cGeo)
        } else {
          const intersectFeatures = turf.intersect(iGeo, cGeo)
        intersectFeatures!.properties = cGeo.properties
        output.features.push(intersectFeatures!)
        }
      } catch (error) {
        console.error('An error occurred in clipping osm data:', error)
        throw error
      }
    }
  }
  return output
}
