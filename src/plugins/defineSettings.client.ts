import type { Settings } from '~/types/types'
import { initialValue } from '~/utils/const'

const filterSettings = (raw: any): Partial<Settings> => {
  const filtered: Partial<Settings> = {}

  for (const key in raw) {
    if (key in initialValue) {
      filtered[key as keyof Settings] = raw[key]
    }
  }

  return filtered
}

const defineSettings = () => {
  const store: Settings = JSON.parse(localStorage.getItem('map-settings')!) || {}
  const filteredStore = filterSettings(store)
  const mergedStore = structuredClone({ ...initialValue, ...filteredStore })
  return mergedStore
}

const resetSettings = () => {
  const store: Settings = structuredClone(initialValue)
  return store
}

export default defineNuxtPlugin(() => {
  return {
    provide: {
      defineSettings,
      filterSettings,
      resetSettings,
    },
  }
})
