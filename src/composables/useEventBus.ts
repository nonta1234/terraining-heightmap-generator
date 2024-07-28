import mitt from 'mitt'
import type { LngLat } from '~/types/types'

type ApplicationEvents = {
  'map:changeLngLat': LngLat
  'map:changeMapSize': number
  'map:miModal': boolean | undefined
  'modal:changeLittArray': void
  'modal:pointDragged': void
  'panel:tabChange': number
  'panel:updateHeight': void
  'debug:operate': void
}

const emitter = mitt<ApplicationEvents>()

export const useEvent = emitter.emit
export const useListen = emitter.on
