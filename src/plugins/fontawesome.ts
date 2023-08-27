import { config, library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'  // eslint-disable-line
import {
  faBars,
  faXmark,
  faArrowsRotate,
  faFileArrowDown,
  faFileImage,
  faThumbtack,
} from '@fortawesome/free-solid-svg-icons'

export default defineNuxtPlugin((nuxtApp) => {
  config.autoAddCss = false
  library.add(
    faBars,
    faXmark,
    faArrowsRotate,
    faFileArrowDown,
    faFileImage,
    faThumbtack,
  )
  nuxtApp.vueApp.component('font-awesome-icon', FontAwesomeIcon)
})
