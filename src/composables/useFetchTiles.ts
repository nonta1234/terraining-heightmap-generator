import { $fetch, type FetchError } from 'ofetch'

export const useFetchTerrainTiles = async (zoom: number, x: number, y: number, token: string, fromMapbox: boolean) => {
  const url = fromMapbox
    ? `https://api.mapbox.com/v4/mapbox.mapbox-terrain-dem-v1/${zoom}/${x}/${y}@2x.pngraw?access_token=${token}`
    : `https://api.maptiler.com/tiles/terrain-rgb-v2/${zoom}/${x}/${y}.webp?key=${token}`
  let data: Blob | undefined
  let error: FetchError | undefined
  try {
    data = await $fetch<Blob>(url)
  } catch (err) {
    error = err as FetchError
  }
  return { data, error }
}

export const useFetchVectorTiles = async (zoom: number, x: number, y: number, token: string) => {
  const url = `https://api.maptiler.com/tiles/v3/${zoom}/${x}/${y}.pbf?key=${token}`
  let data: Blob | undefined
  let error: FetchError | undefined
  try {
    data = await $fetch<Blob>(url)
  } catch (err) {
    error = err as FetchError
  }
  return { data, error }
}

export const useFetchOceanTiles = async (zoom: number, x: number, y: number, token: string) => {
  const url = `https://api.maptiler.com/tiles/ocean-rgb/${zoom}/${x}/${y}.webp?key=${token}`
  let data: Blob | undefined
  let error: FetchError | undefined
  try {
    data = await $fetch<Blob>(url)
  } catch (err) {
    error = err as FetchError
  }
  return { data, error }
}
