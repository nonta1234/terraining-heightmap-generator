import mitt from 'mitt'
import type { LngLat } from '~/types/types'

type ApplicationEvents = {
  'map:changeLngLat': LngLat;
  'map:changeMapSize': number;
  'map:leModal': boolean | undefined;
  'map:cpModal': boolean | undefined;
  'map:miModal': boolean | undefined;
  'modal:changeLittArray': void;
  'modal:pointDragged': void;
  'debug:operate': void;
};

const emitter = mitt<ApplicationEvents>()

export const useEvent = emitter.emit
export const useListen = emitter.on
