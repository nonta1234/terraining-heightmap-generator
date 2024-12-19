import * as turf from '@turf/turf'
import type { Feature, Polygon, MultiPolygon, FeatureCollection, GeoJsonProperties } from 'geojson'
import { geojson2osm } from 'geojson2osm'
import osm2geojson from 'osm2geojson-lite'
import { getGeom } from '@turf/invariant'
import { getExtent } from '~/utils/getExtent'
import booleanContains from '~/utils/contains'
import type { GenerateMapOption } from '~/types/types'

function clip(clippingData: Feature<Polygon, GeoJsonProperties>, inputData: turf.AllGeoJSON) {
  const output: FeatureCollection = {
    type: 'FeatureCollection',
    features: Array<Feature>(),
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
          const iGeoType = getGeom(iGeo).type
          if (iGeoType === 'Polygon' || iGeoType === 'MultiPolygon') {
            const featureCollection: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>
              = turf.featureCollection([iGeo as Feature<Polygon | MultiPolygon, GeoJsonProperties>])
            featureCollection.features[0].properties = iGeo.properties
            const intersectFeatures = turf.intersect(featureCollection, cGeo)
            if (intersectFeatures) {
              intersectFeatures.properties = cGeo.properties
              output.features.push(intersectFeatures)
            }
          }
        }
      } catch (error) {
        console.error('An error occurred in clipping osm data:', error)
        throw error
      }
    }
  }
  return output
}

class GetOsmMapWorker {
  private worker: Worker

  constructor() {
    this.worker = self as any
    self.onmessage = this.handleMessage.bind(this)
  }

  private async handleMessage(e: MessageEvent<any>) {
    try {
      const { settings } = e.data as GenerateMapOption
      if (!settings) {
        throw new Error('GetOsmMapWorker: Invalid parameter')
      }

      let url = ''
      let area = turf.bboxPolygon([0, 0, 0, 0])
      const offset = settings.gridInfo === 'cs1' ? 0 : 0.375

      if (settings.angle === 0) {
        const { minX, minY, maxX, maxY } = getExtent(settings.lng, settings.lat, settings.size, offset)
        url = `https://overpass-api.de/api/map?bbox=${minX},${minY},${maxX},${maxY}`
      } else {
        const { minX: minX1, minY: minY1, maxX: maxX1, maxY: maxY1 } = getExtent(settings.lng, settings.lat, settings.size * Math.SQRT2, offset)
        url = `https://overpass-api.de/api/map?bbox=${minX1},${minY1},${maxX1},${maxY1}`
        const { minX, minY, maxX, maxY } = getExtent(settings.lng, settings.lat, settings.size, offset)
        area = turf.bboxPolygon([minX, minY, maxX, maxY])
      }

      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`An error occurred in download osm data: ${res.status}`)
      }
      const osmData = async () => {
        const osm = await res.text()
        if (settings.angle === 0) {
          // const geojsonData = osm2geojson(osm, { completeFeature: true, allFeatures: true, renderTagged: true }) as any
          // return geojson2osm(geojsonData)
          return osm
        } else {
          const geojsonData = osm2geojson(osm, { completeFeature: true, allFeatures: true, renderTagged: true }) as turf.AllGeoJSON
          turf.transformRotate(geojsonData, -settings.angle, { pivot: [settings.lng, settings.lat], mutate: true })
          const clipedGeojson = clip(area, geojsonData)
          return geojson2osm(clipedGeojson)
        }
      }
      const result = await osmData()
      const encoder = new TextEncoder()
      const buffer = encoder.encode(result)
      this.worker.postMessage(buffer, [buffer.buffer])
    } catch (error) {
      console.error('An error occurred in getOsmDataWorker:', error)
      this.worker.postMessage({ error: error instanceof Error ? error.message : 'An unknown error occurred' })
    }
  }
}

export default new GetOsmMapWorker()
