import { config, library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'  // eslint-disable-line
import {
  faBars,
  faXmark,
  faArrowsRotate,
  faFileArrowDown,
  faFileImage,
  faThumbtack,
  faGear,
} from '@fortawesome/free-solid-svg-icons'
import {
  faCircleQuestion,
} from '@fortawesome/free-regular-svg-icons'

export default defineNuxtPlugin((nuxtApp) => {
  config.autoAddCss = false
  library.add(
    faBars,
    faXmark,
    faArrowsRotate,
    faFileArrowDown,
    faFileImage,
    faThumbtack,
    faCircleQuestion,
    faGear,
  )
  nuxtApp.vueApp.component('font-awesome-icon', FontAwesomeIcon)
})
