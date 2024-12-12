import * as Comlink from 'comlink'
import type { GetCitiesMapWorkerType } from '~/assets/workers/getCitiesMapWorker'
import GetCitiesMapWorker from '~/assets/workers/getCitiesMapWorker.ts?worker'
import type { ProgressData } from '~/types/types'

export const initializeWorker = async () => {
  const worker = useWorker()

  try {
    if (!worker.value) {
      const progressCallback = (data: ProgressData) => {
        switch (data.type) {
          case 'total':
            useEvent('message:total', data.data as number)
            break

          case 'progress':
            useEvent('message:progress')
            break

          case 'phase':
            useEvent('message:phase', data.data?.toString() || '')
            break
        }
      }

      worker.value = Comlink.wrap<GetCitiesMapWorkerType>(new GetCitiesMapWorker())
      await worker.value.setCallback(Comlink.proxy(progressCallback))
    }
  } catch (error: any) {
    console.error('Failed to initialize worker:', error.message)
    worker.value = undefined
    throw error
  }
}

export const useWorker = () => {
  const mainWorker = useState<Comlink.Remote<GetCitiesMapWorkerType> | undefined>('worker', () => undefined)
  return mainWorker
}
