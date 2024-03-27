import { Map } from 'mapbox-gl'
import type { StyleList } from '~/types/types'

/**
const defaultHillshade = [
  'interpolate',
  ['linear'],
  ['zoom'],
  14,
  [
    'match',
    ['get', 'class'],
    'shadow',
    'hsla(66, 38%, 17%, 0.08)',
    'hsla(60, 20%, 95%, 0.14)',
  ],
  16,
  [
    'match',
    ['get', 'class'],
    'shadow',
    'hsla(66, 38%, 17%, 0)',
    'hsla(60, 20%, 95%, 0)',
  ],
]

const effectedHillshade = [
  'interpolate',
  ['linear'],
  ['zoom'],
  14,
  [
    'match',
    ['get', 'class'],
    'shadow',
    'hsla(66, 20%, 17%, 0.24)',
    'hsla(60, 2%, 95%, 0.14)',
  ],
  16,
  [
    'match',
    ['get', 'class'],
    'shadow',
    'hsla(66, 20%, 17%, 0.08)',
    'hsla(60, 2%, 95%, 0)',
  ],
]
*/

/** */

export class HomeButton implements mapboxgl.IControl {
  onAdd(map: Map) {
    const div = document.createElement('div')
    div.className = 'mapboxgl-ctrl mapboxgl-ctrl-group'
    div.innerHTML = `<button type="button" class="home-button" aria-label="To grid position" aria-disabled="false" title="To grid position" style="padding-bottom:1px">
      <svg xmlns="http://www.w3.org/2000/svg" height="19px" viewBox="0 0 576 512" fill="#F1F3F4"><!--! Font Awesome Free 6.4.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path d="M575.8 255.5c0 18-15 32.1-32 32.1h-32l.7 160.2c0 2.7-.2 5.4-.5 8.1V472c0 22.1-17.9 40-40 40H456c-1.1 0-2.2 0-3.3-.1c-1.4 .1-2.8 .1-4.2 .1H416 392c-22.1 0-40-17.9-40-40V448 384c0-17.7-14.3-32-32-32H256c-17.7 0-32 14.3-32 32v64 24c0 22.1-17.9 40-40 40H160 128.1c-1.5 0-3-.1-4.5-.2c-1.2 .1-2.4 .2-3.6 .2H104c-22.1 0-40-17.9-40-40V360c0-.9 0-1.9 .1-2.8V287.6H32c-18 0-32-14-32-32.1c0-9 3-17 10-24L266.4 8c7-7 15-8 22-8s15 2 21 7L564.8 231.5c8 7 12 15 11 24z"/></svg>
      </button>`
    div.addEventListener('contextmenu', e => e.preventDefault())
    div.addEventListener('click', () => {
      const mapbox = useMapbox()
      map.panTo([mapbox.value.settings.lng, mapbox.value.settings.lat])
      saveSettings(mapbox.value.settings)
    })
    return div
  }

  onRemove() {}
}


export class ResetGridDirection implements mapboxgl.IControl {
  private _pressPosition: Array<number>
  private _pressTimer: string | number | NodeJS.Timeout | undefined
  private _isIos: boolean

  private clearTimer(force: boolean, e?: TouchEvent) {
    if (force) {
      clearTimeout(this._pressTimer)
    } else if (this._pressPosition && e && e.touches) {
      const pixel = [e.touches[0].clientX, e.touches[0].clientY]
      if (this._pressPosition[0] > pixel[0] + 20 || this._pressPosition[0] < pixel[0] - 20 ||
          this._pressPosition[1] > pixel[1] + 20 || this._pressPosition[1] < pixel[1] - 20) {
        this._pressPosition = []
        clearTimeout(this._pressTimer)
      }
    }
  }

  private longPress() {
    const mapbox = useMapbox()
    mapbox.value.map?.easeTo({
      bearing: mapbox.value.settings.angle,
      easing: ease,
      duration: 1000,
    })
    saveSettings(mapbox.value.settings)
  }

  constructor() {
    this._pressPosition = []
    this._pressTimer = undefined
    const { isIos } = useDevice()
    this._isIos = isIos
  }

  onAdd() {
    const div = document.createElement('div')
    div.className = 'mapboxgl-ctrl mapboxgl-ctrl-group'
    div.innerHTML = `<button type="button" aria-label="Reset grid direction" aria-disabled="false" title="Reset grid direction">
      <svg xmlns="http://www.w3.org/2000/svg" height="19px" viewBox="0 0 448 512" fill="#F1F3F4"><!--! Font Awesome Free 6.4.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path d="M384 96V224H256V96H384zm0 192V416H256V288H384zM192 224H64V96H192V224zM64 288H192V416H64V288zM64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64z"/></svg>
      </button>`
    div.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      this.longPress()
    })

    if (this._isIos) {
      div.addEventListener('touchstart', (e) => {
        this.clearTimer(true)
        this._pressPosition = [e.touches[0].clientX, e.touches[0].clientY]
        this._pressTimer = setTimeout(() => {
          this._pressPosition = []
          e.preventDefault()
          this.longPress()
        }, 1000)
      })
      div.addEventListener('touchend', () => {
        this.clearTimer(true)
      }, false)
      div.addEventListener('touchcancel', () => {
        this.clearTimer(true)
      }, false)
      div.addEventListener('touchmove', (e) => {
        this.clearTimer(false, e)
      }, false)
    }

    div.addEventListener('click', () => {
      const startAngle = getGridAngle()
      if (startAngle === 0) { return }
      const mapbox = useMapbox()
      const startTime = Date.now()
      const duration = 1000

      const rotateAnimation = () => {
        const progress = Math.min(1, (Date.now() - startTime) / duration)
        mapbox.value.settings.angle = startAngle * (1 - ease(progress))
        setGrid(mapbox, [mapbox.value.settings.lng, mapbox.value.settings.lat], false)
        if (progress < 1) {
          requestAnimationFrame(rotateAnimation)
        }
      }

      rotateAnimation()
      mapbox.value.settings.angle = 0
      setGrid(mapbox, [mapbox.value.settings.lng, mapbox.value.settings.lat], false)
      saveSettings(mapbox.value.settings)
    })
    return div
  }

  onRemove() {
    this._pressPosition = []
    this._pressTimer = undefined
  }
}


export class StyleButton implements mapboxgl.IControl {
  private _list: StyleList

  constructor(list: StyleList) {
    this._list = list
  }

  onAdd(map: Map) {
    const device = useDevice()
    const listStr: string[] = []
    for (const key in this._list) {
      listStr.push(`<option value="${this._list[key].value}">${this._list[key].text + (device.isFirefox ? '' : '&nbsp;&nbsp;')}</option>\n`)
    }
    const chunk = listStr.join('')
    const div = document.createElement('div')
    div.className = 'mapboxgl-ctrl mapboxgl-ctrl-group'
    div.innerHTML = `<button type="button" class="style-button" aria-label="Change map style" aria-disabled="false" title="Change map style">
      <svg xmlns="http://www.w3.org/2000/svg" height="19px" viewBox="0 0 576 512" fill="#F1F3F4"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M264.5 5.2c14.9-6.9 32.1-6.9 47 0l218.6 101c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L45.9 149.8C37.4 145.8 32 137.3 32 128s5.4-17.9 13.9-21.8L264.5 5.2zM476.9 209.6l53.2 24.6c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L45.9 277.8C37.4 273.8 32 265.3 32 256s5.4-17.9 13.9-21.8l53.2-24.6 152 70.2c23.4 10.8 50.4 10.8 73.8 0l152-70.2zm-152 198.2l152-70.2 53.2 24.6c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L45.9 405.8C37.4 401.8 32 393.3 32 384s5.4-17.9 13.9-21.8l53.2-24.6 152 70.2c23.4 10.8 50.4 10.8 73.8 0z"/></svg>
      </button>
      <select id="select-style">
      <option value="" disabled>--Select style--${device.isFirefox ? '' : '&nbsp;&nbsp;'}</option>
      ${chunk}</select>`
    div.addEventListener('contextmenu', e => e.preventDefault())
    div.addEventListener('change', (e) => {
      if (!(e.target instanceof HTMLSelectElement)) {
        return
      }
      if (e.target.value !== this._list[map.getStyle().name!].value) {
        map.setStyle(getStyleUrl(e.target.value))
        const mapbox = useMapbox()
        saveSettings(mapbox.value.settings)
      }
    })
    return div
  }

  onRemove() {
    this._list = {}
  }
}


export class EffectedArea implements mapboxgl.IControl {
  private _visibility: boolean
  constructor(visibility: boolean) {
    this._visibility = visibility
  }

  onAdd() {
    const div = document.createElement('div')
    const svgFillColor = this._visibility ? '#F1F3F4' : '#86888A'
    div.className = 'mapboxgl-ctrl mapboxgl-ctrl-group'
    div.innerHTML = `<button type="button" class="effected-area" aria-label="Show the smooth & sharpen area" aria-disabled="false" title="Show the smooth & sharpen area" style="padding-bottom:2px">
      <svg xmlns="http://www.w3.org/2000/svg" id="effected-area-svg" height="17px" viewBox="0 0 640 512" fill="${svgFillColor}"><!--! Font Awesome Free 6.4.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path d="M560 160A80 80 0 1 0 560 0a80 80 0 1 0 0 160zM55.9 512H381.1h75H578.9c33.8 0 61.1-27.4 61.1-61.1c0-11.2-3.1-22.2-8.9-31.8l-132-216.3C495 196.1 487.8 192 480 192s-15 4.1-19.1 10.7l-48.2 79L286.8 81c-6.6-10.6-18.3-17-30.8-17s-24.1 6.4-30.8 17L8.6 426.4C3 435.3 0 445.6 0 456.1C0 487 25 512 55.9 512z"/></svg>
      </button>`
    div.addEventListener('contextmenu', e => e.preventDefault())
    div.addEventListener('click', () => {
      this._visibility = !this._visibility
      const button = document.getElementById('effected-area-svg')
      const mapbox = useMapbox()
      if (this._visibility) {
        button?.setAttribute('fill', '#F1F3F4')
        mapbox.value.map?.setLayoutProperty('sharpenLayer', 'visibility', 'visible')
        mapbox.value.map?.setLayoutProperty('smoothLayer', 'visibility', 'visible')
        mapbox.value.map?.setLayoutProperty('hillshading', 'visibility', 'visible')
        // mapbox.value.map?.setPaintProperty('hillshade', 'fill-color', effectedHillshade)
        mapbox.value.settings.displayEffectArea = true
        saveSettings(mapbox.value.settings)
      } else {
        button?.setAttribute('fill', '#86888A')
        // mapbox.value.map?.setPaintProperty('hillshade', 'fill-color', defaultHillshade)
        mapbox.value.map?.setLayoutProperty('hillshading', 'visibility', 'none')
        mapbox.value.map?.setLayoutProperty('smoothLayer', 'visibility', 'none')
        mapbox.value.map?.setLayoutProperty('sharpenLayer', 'visibility', 'none')
        mapbox.value.settings.displayEffectArea = false
        saveSettings(mapbox.value.settings)
      }
    })
    return div
  }

  onRemove() {}
}


function ease(x: number) {
  return 1 - Math.pow(1 - x, 3)
}

function getStyleUrl(value: string) {
  return `mapbox://styles/mapbox/${value}?optimize=true`
}
