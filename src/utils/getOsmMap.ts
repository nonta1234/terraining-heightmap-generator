import * as turf from '@turf/turf'
import geojsontoosm from 'geojsontoosm'
import osm2geojson from 'osm2geojson-lite'
import booleanContains from '~/utils/contains'

export const getOsmMap = async () => {
  const mapbox = useMapbox()
  let url = ''
  let area: turf.FeatureCollection = turf.flatten(turf.bboxPolygon([0, 0, 0, 0]))

  if (mapbox.value.settings.angle === 0) {
    const { minLng, minLat, maxLng, maxLat } = getBoundsLngLat(mapbox.value.settings.size)
    url = `https://overpass-api.de/api/map?bbox=${minLng},${minLat},${maxLng},${maxLat}`
  } else {
    const { minLng, minLat, maxLng, maxLat } = getBoundsLngLat(mapbox.value.settings.size * Math.SQRT2)
    url = `https://overpass-api.de/api/map?bbox=${minLng},${minLat},${maxLng},${maxLat}`
    const { minLng: minX, minLat: minY, maxLng: maxX, maxLat: maxY } = getBoundsLngLat(mapbox.value.settings.size)
    area = turf.flatten(turf.bboxPolygon([minX, minY, maxX, maxY]))
  }

  try {
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
      throw new Error(`download osm data error: ${res.status}`)
    }
  } catch (e: any) {
    throw new Error(e.message)
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
      } catch (e: any) {
        // console.log(e.message)
      }
    }
  }
  return output
}
