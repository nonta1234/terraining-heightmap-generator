import type { Settings } from '~/types/types'

export const saveSettings = (settings: Settings) => {
  localStorage.setItem('map-settings', JSON.stringify(settings))
  // console.log(settings)
}
