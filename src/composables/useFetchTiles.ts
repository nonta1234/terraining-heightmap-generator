export const useFetchTerrainTiles = async (zoom: number, x: number, y: number) => {
  const config = useRuntimeConfig()
  const mapbox = useMapbox()
  const token = mapbox.value.settings.accessToken || config.public.token
  const url = `https://api.mapbox.com/v4/mapbox.mapbox-terrain-dem-v1/${zoom}/${x}/${y}@2x.pngraw?access_token=${token}`
  const { data, error } = await useFetch<Blob>(url, { key: `terrain-dem:${zoom}-${x}-${y}` })
  return { data, error }
}

export const useFetchVectorTiles = async (zoom: number, x: number, y: number) => {
  const config = useRuntimeConfig()
  const mapbox = useMapbox()
  const token = mapbox.value.settings.accessToken || config.public.token
  const url = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/${zoom}/${x}/${y}.vector.pbf?access_token=${token}`
  const { data, error } = await useFetch<Blob>(url, { key: `mapbox-streets-v8:${zoom}-${x}-${y}` })
  return { data, error }
}
