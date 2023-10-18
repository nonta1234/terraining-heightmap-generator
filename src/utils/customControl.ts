import { Map } from 'mapbox-gl'
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

export class HomeButton {
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


export class ResetGridDirection {
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

  private longTap() {
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
      this.longTap()
    })

    if (this._isIos) {
      div.addEventListener('touchstart', (e) => {
        this.clearTimer(true)
        this._pressPosition = [e.touches[0].clientX, e.touches[0].clientY]
        this._pressTimer = setTimeout(() => {
          this._pressPosition = []
          e.preventDefault()
          this.longTap()
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
      const mapbox = useMapbox()
      const startAngle = getGridAngle()
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

  onRemove() {}
}


export class EffectedArea {
  private _visibility: boolean
  constructor() {
    this._visibility = false
  }

  onAdd() {
    const div = document.createElement('div')
    div.className = 'mapboxgl-ctrl mapboxgl-ctrl-group'
    div.innerHTML = `<button type="button" class="effected-area" aria-label="Show the smooth & sharpen area" aria-disabled="false" title="Show the smooth & sharpen area" style="padding-bottom:2px">
      <svg xmlns="http://www.w3.org/2000/svg" id="effected-area-svg" height="17px" viewBox="0 0 640 512" fill="#86888A"><!--! Font Awesome Free 6.4.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path d="M560 160A80 80 0 1 0 560 0a80 80 0 1 0 0 160zM55.9 512H381.1h75H578.9c33.8 0 61.1-27.4 61.1-61.1c0-11.2-3.1-22.2-8.9-31.8l-132-216.3C495 196.1 487.8 192 480 192s-15 4.1-19.1 10.7l-48.2 79L286.8 81c-6.6-10.6-18.3-17-30.8-17s-24.1 6.4-30.8 17L8.6 426.4C3 435.3 0 445.6 0 456.1C0 487 25 512 55.9 512z"/></svg>
      </button>`
    div.addEventListener('contextmenu', e => e.preventDefault())
    div.addEventListener('click', () => {
      const button = document.getElementById('effected-area-svg')
      button?.setAttribute('fill', '#F1F3F4')
      this._visibility = !this._visibility
      const mapbox = useMapbox()
      if (this._visibility) {
        button?.setAttribute('fill', '#F1F3F4')
        mapbox.value.map?.setLayoutProperty('sharpenLayer', 'visibility', 'visible')
        mapbox.value.map?.setLayoutProperty('smoothLayer', 'visibility', 'visible')
        mapbox.value.map?.setLayoutProperty('hillshading', 'visibility', 'visible')
        // mapbox.value.map?.setPaintProperty('hillshade', 'fill-color', effectedHillshade)
      } else {
        button?.setAttribute('fill', '#86888A')
        // mapbox.value.map?.setPaintProperty('hillshade', 'fill-color', defaultHillshade)
        mapbox.value.map?.setLayoutProperty('hillshading', 'visibility', 'none')
        mapbox.value.map?.setLayoutProperty('smoothLayer', 'visibility', 'none')
        mapbox.value.map?.setLayoutProperty('sharpenLayer', 'visibility', 'none')
      }
    })
    return div
  }

  onRemove() {}
}


function ease(x: number): number {
  return 1 - Math.pow(1 - x, 3)
}
