export const useFetchTerrainTiles = async (zoom: number, x: number, y: number) => {
  const config = useRuntimeConfig()
  const url = `https://api.mapbox.com/v4/mapbox.terrain-rgb/${zoom}/${x}/${y}@2x.pngraw?access_token=${config.public.token}`
  const { data, error } = await useFetch<Blob>(url, { key: `terrain-rgb:${zoom}-${x}-${y}` })
  return { data, error }
}

export const useFetchVectorTiles = async (zoom: number, x: number, y: number) => {
  const config = useRuntimeConfig()
  const url = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/${zoom}/${x}/${y}.vector.pbf?access_token=${config.public.token}`
  const { data, error } = await useFetch<Blob>(url, { key: `mapbox-streets-v8:${zoom}-${x}-${y}` })
  return { data, error }
}
