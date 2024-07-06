import GetCustomMapImageWorker from '~/assets/workers/getCustomMapImageWorker.ts?worker'
import type { Settings } from '~/types/types'

const getCustomMapImageData = (settings: Settings, styleUrl: string, zoom: number, offset?: number, maxImageSize?: number, imageSize?: number) => {
  const worker = new GetCustomMapImageWorker()
  const data = {
    settings,
    styleUrl,
    zoom,
    offset,
    maxImageSize,
    imageSize,
  }
  const mapImageOption = JSON.parse(JSON.stringify(data))
  const result = new Promise<Blob>((resolve, reject) => {
    worker.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'error') {
        alert(e.data.message)
        reject(new Error(e.data.message))
        worker.terminate()
      } else if (e.data) {
        resolve(e.data)
        worker.terminate()
      }
    }, { once: true })
  })
  worker.onerror = (e) => {
    alert(e.message)
    throw e
  }
  worker.postMessage(mapImageOption)
  return result
}

/**
 * Get customized map image with worker.
 * @param style
 * @param zoom
 * @param imageSize
 * @return Promise\<Blob\>
 */
export const getCustomMapImage = async (style: string, zoom: number, offset?: number, maxImageSize?: number, imageSize?: number) => {
  try {
    const { settings } = useMapbox().value
    if (!isTokenValid()) {
      throw new Error('Invaid access token')
    }
    const result = await getCustomMapImageData(settings, style, zoom, offset, maxImageSize, imageSize)
    return result
  } catch (error) {
    console.error('An error occurred in getCustomMapImage:', error)
    throw error
  }
}


/**
 * Get map image.
 * @param style
 * @return Promise\<Blob\>
 */
export const getMapImage = async (style: string, offset?: number) => {
  const { settings } = useMapbox().value
  const config = useRuntimeConfig()
  let url = ''
  if (settings.angle === 0) {
    const pixels = 1280
    const { minX, minY, maxX, maxY } = getExtent(
      settings.lng,
      settings.lat,
      settings.size,
      offset || 0,
    )
    url = 'https://api.mapbox.com/styles/v1/' +
          `${style}/static/[${minX},${minY},${maxX},${maxY}` +
          `]/${pixels}x${pixels}@2x?access_token=${config.public.token}`
  } else {
    let decimals = 1
    let zoom = 0
    let pixel = 0

    for (let i = 640; i < 1281; i++) {
      const calcZoom = calculateZoomLevel(
        settings.lat,
        settings.size * (1 - (offset || 0) * 2),
        i,
        512,
      )
      const z = calcZoom - Math.floor(calcZoom)
      if (z < decimals) {
        zoom = calcZoom
        decimals = z
        pixel = i
      }
    }
    const roundedZoom = Math.round(zoom * 100) / 100
    const bearing = (settings.angle > 0) ? settings.angle : settings.angle + 360

    url = 'https://api.mapbox.com/styles/v1/' +
          `${style}/static/` +
          `${settings.lng},${settings.lat},${roundedZoom},${bearing}` +
          `/${pixel}x${pixel}@2x?access_token=${config.public.token}`
  }

  try {
    const res = await fetch(url)
    if (res.ok) {
      return await res.blob()
    } else {
      throw new Error(`download map image error: ${res.status}`)
    }
  } catch (error) {
    console.error('An error occurred in getMapImage:', error)
    throw error
  }
}
