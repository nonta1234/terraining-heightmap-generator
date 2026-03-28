import type { FetchResult } from '@/types/types'
import { $fetch, type FetchError } from 'ofetch'

const fetchTile = async (url: string): Promise<FetchResult<Blob>> => {
  try {
    const data = await $fetch<Blob>(url, {
      timeout: 15000,
      retry: 3,
      retryDelay: 2000,
    })
    return { status: 'success', data }
  } catch (error) {
    return { status: 'error', error: error as FetchError }
  }
}

const fetchTileWithRetry = async (url: string, retries = 3): Promise<FetchResult<Blob>> => {
  const result = await fetchTile(url)
  if (result.status === 'success') {
    return result
  } else {
    // return { status: 'error', error: result.error }
    return { status: 'error', error: new Error(`Failed to fetch tile after ${retries} attempts`) }
  }
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

const MAX_CONCURRENT_REQUESTS = 16

export const limitedParallelFetch = async <T>(
  tasks: (() => Promise<T>)[],
  limit = MAX_CONCURRENT_REQUESTS,
): Promise<T[]> => {
  const results: T[] = []
  const executing: Promise<void>[] = []

  for (const task of tasks) {
    const p = task().then((result) => {
      results.push(result)
    })

    executing.push(p)

    if (executing.length >= limit) {
      await Promise.race(executing)
      // Remove the finished promise from executing
      const index = executing.findIndex(p => p === Promise.race(executing))
      if (index !== -1) executing.splice(index, 1)
    }
  }

  await Promise.all(executing)
  return results
}
