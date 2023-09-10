import mitt from 'mitt'
import { LngLat } from '~/types/types'

type ApplicationEvents = {
  'map:changeLngLat': LngLat;
  'map:changeMapSize': number;
  'map:leModal': void;
  'map:cpModal': void;
  'modal:changeLittArray': void;
  'modal:pointDragged': void;
  'debug:operate': void;
};

const emitter = mitt<ApplicationEvents>()

export const useEvent = emitter.emit
export const useListen = emitter.on
