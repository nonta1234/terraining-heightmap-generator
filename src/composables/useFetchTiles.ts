import { $fetch, type FetchError } from 'ofetch'

export const useFetchTerrainTiles = async (zoom: number, x: number, y: number, token: string) => {
  const url = `https://api.mapbox.com/v4/mapbox.mapbox-terrain-dem-v1/${zoom}/${x}/${y}@2x.pngraw?access_token=${token}`
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
  const url = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/${zoom}/${x}/${y}.vector.pbf?access_token=${token}`
  let data: Blob | undefined
  let error: FetchError | undefined
  try {
    data = await $fetch<Blob>(url)
  } catch (err) {
    error = err as FetchError
  }
  return { data, error }
}
