import type { FetchResult } from '@/types/types'
import { $fetch, type FetchError } from 'ofetch'

const fetchTile = async (url: string, options?: { timeout?: number }): Promise<FetchResult<Blob>> => {
  try {
    const data = await $fetch<Blob>(url, {
      timeout: options?.timeout ?? 5000,
    })
    return { status: 'success', data }
  } catch (error) {
    return { status: 'error', error: error as FetchError }
  }
}

const fetchTileWithRetry = async (url: string, retries = 3): Promise<FetchResult<Blob>> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const result = await fetchTile(url)
    if (result.status === 'success') {
      return result
    }
    console.warn(`Fetch failed (${url}) attempt ${attempt}/${retries}`)
  }
  return { status: 'error', error: new Error(`Failed to fetch tile after ${retries} attempts`) }
}

export const useFetchTerrainTiles = async (zoom: number, x: number, y: number, token: string, fromMapbox: boolean) => {
  const url = fromMapbox
    ? `https://api.mapbox.com/v4/mapbox.mapbox-terrain-dem-v1/${zoom}/${x}/${y}@2x.pngraw?access_token=${token}`
    : `https://api.maptiler.com/tiles/terrain-rgb-v2/${zoom}/${x}/${y}.webp?key=${token}`

  return await fetchTileWithRetry(url)
}

export const useFetchVectorTiles = async (zoom: number, x: number, y: number, token: string) => {
  const url = `https://api.maptiler.com/tiles/v3/${zoom}/${x}/${y}.pbf?key=${token}`
  return await fetchTileWithRetry(url)
}

export const useFetchOceanTiles = async (zoom: number, x: number, y: number, token: string) => {
  const url = `https://api.maptiler.com/tiles/ocean-rgb/${zoom}/${x}/${y}.webp?key=${token}`
  return await fetchTileWithRetry(url)
}
