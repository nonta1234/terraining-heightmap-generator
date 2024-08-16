export const isTokenValid = () => {
  const { settings } = useMapbox().value
  const config = useRuntimeConfig()
  return !(settings.accessToken === '' || settings.accessToken === config.public.mapboxToken)
}
