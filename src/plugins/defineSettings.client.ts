import { Settings } from '~/types/types'

const defineSettings = () => {
  const store: Settings = JSON.parse(localStorage.getItem('map-settings')!) || {}
  store.lng = typeof store.lng === 'undefined' ? initialValue.lng : store.lng
  store.lat = typeof store.lat === 'undefined' ? initialValue.lat : store.lat
  store.zoom = typeof store.zoom === 'undefined' ? initialValue.zoom : store.zoom
  store.size = typeof store.size === 'undefined' ? initialValue.size : store.size
  store.angle = typeof store.angle === 'undefined' ? initialValue.angle : store.angle
  store.seaLevel = typeof store.seaLevel === 'undefined' ? initialValue.seaLevel : store.seaLevel
  store.adjLevel = typeof store.adjLevel === 'undefined' ? initialValue.adjLevel : store.adjLevel
  store.vertScale = typeof store.vertScale === 'undefined' ? initialValue.vScale : store.vertScale
  store.fixedRatio = typeof store.fixedRatio === 'undefined' ? initialValue.fixedRatio : store.fixedRatio
  store.type = store.type || initialValue.type
  store.depth = typeof store.depth === 'undefined' ? initialValue.depth : store.depth
  store.streamDepth = typeof store.streamDepth === 'undefined' ? initialValue.streamDepth : store.streamDepth
  store.littoral = typeof store.littoral === 'undefined' ? initialValue.littoral : store.littoral
  store.littArray = store.littArray || initialValue.littArray
  store.smoothing = typeof store.smoothing === 'undefined' ? initialValue.smoothing : store.smoothing
  store.smthThres = typeof store.smthThres === 'undefined' ? initialValue.smthThres : store.smthThres
  store.smthFade = typeof store.smthFade === 'undefined' ? initialValue.smthFade : store.smthFade
  store.smoothCount = typeof store.smoothCount === 'undefined' ? initialValue.smoothCount : store.smoothCount
  store.sharpen = typeof store.sharpen === 'undefined' ? initialValue.sharpen : store.sharpen
  store.shrpThres = typeof store.shrpThres === 'undefined' ? initialValue.shrpThres : store.shrpThres
  store.shrpFade = typeof store.shrpFade === 'undefined' ? initialValue.shrpFade : store.shrpFade
  store.gridInfo = store.gridInfo || initialValue.gridInfo
  store.interpolation = store.interpolation || initialValue.interpolation
  store.noise = typeof store.noise === 'undefined' ? initialValue.noise : store.noise
  store.noiseGrid = typeof store.noiseGrid === 'undefined' ? initialValue.noiseGrid : store.noiseGrid
  store.displayEffect = typeof store.displayEffect === 'undefined' ? initialValue.displayEffect : store.displayEffect
  return store
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
