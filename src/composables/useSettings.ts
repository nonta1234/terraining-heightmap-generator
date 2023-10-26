import type { Settings } from '~/types/types'

export const useDefineSettings = () => {
  const settings  = useState<Settings>('settings', () => {
    const { $defineSettings } = useNuxtApp()
    const defineSettings = $defineSettings()
    return defineSettings
  })
  return settings
}
