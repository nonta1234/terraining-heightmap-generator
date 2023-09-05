import { Settings } from '~/types/types'

const defineSettings = () => {
  const store: Settings = JSON.parse(localStorage.getItem('map-settings')!) || {}
  store.lng = store.lng || initialValue.lng
  store.lat = store.lat || initialValue.lat
  store.zoom = store.zoom || initialValue.zoom
  store.size = store.size || initialValue.size
  store.angle = store.angle || initialValue.angle
  store.seaLevel = store.seaLevel || initialValue.seaLevel
  store.adjLevel = typeof store.adjLevel === 'undefined' ? initialValue.adjLevel : store.adjLevel
  store.vertScale = store.vertScale || initialValue.vScale
  store.fixedRatio = typeof store.fixedRatio === 'undefined' ? initialValue.fixedRatio : store.fixedRatio
  store.type = store.type || initialValue.type
  store.depth = store.depth || initialValue.depth
  store.littoral = store.littoral || initialValue.littoral
  store.littArray = store.littArray || initialValue.littArray
  store.smoothing = store.smoothing || initialValue.smoothing
  store.smthThres = store.smthThres || initialValue.smthThres
  store.smthFade = store.smthFade || initialValue.smthFade
  store.sharpen = store.sharpen || initialValue.sharpen
  store.shrpThres = store.shrpThres || initialValue.shrpThres
  store.shrpFade = store.shrpFade || initialValue.shrpFade
  store.gridInfo = typeof store.gridInfo === 'undefined' ? initialValue.gridInfo : store.gridInfo
  return store
}

export default defineNuxtPlugin(() => {
  return {
    provide: {
      defineSettings,
    },
  }
})
