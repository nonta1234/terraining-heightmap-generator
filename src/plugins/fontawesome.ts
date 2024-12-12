import { config, library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faBars,
  faXmark,
  faArrowsRotate,
  faThumbtack,
  faGear,
  faArrowRotateRight,
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
    faThumbtack,
    faCircleQuestion,
    faGear,
    faArrowRotateRight,
  )
  nuxtApp.vueApp.component('font-awesome-icon', FontAwesomeIcon)
})
