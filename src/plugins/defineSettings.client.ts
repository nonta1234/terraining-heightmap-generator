import type { Settings } from '~/types/types'

const defineSettings = () => {
  const store: Settings = JSON.parse(localStorage.getItem('map-settings')!) || {}
  const mergedStore = { ...initialValue, ...store }
  return mergedStore
}

const resetSettings = () => {
  const store: Settings = JSON.parse(JSON.stringify(initialValue))
  return store
}


export default defineNuxtPlugin(() => {
  return {
    provide: {
      defineSettings,
      resetSettings,
    },
  }
})
