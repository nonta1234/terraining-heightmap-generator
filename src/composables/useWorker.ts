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
            useEvent('generate:total', data.data as number)
            break

          case 'progress':
            useEvent('generate:progress')
            break

          case 'phase':
            useEvent('generate:phase', data.data?.toString() || '')
            break
        }
      }

      worker.value = Comlink.wrap<GetCitiesMapWorkerType>(new GetCitiesMapWorker())
      await worker.value.setCallback(Comlink.proxy(progressCallback))
      await setRequiredSubWorkers()
    }
  } catch (error: any) {
    console.error('Failed to initialize worker:', error)
    worker.value = undefined
    throw error
  }
}

export const setRequiredSubWorkers = async () => {
  const { settings } = useMapbox().value
  const worker = useWorker()
  await worker.value?.setSubWorker(0)

  const count = settings.originalPreview
    ? (settings.gridInfo === 'cs2' ? 6 : (settings.resolution > 8192 ? 5 : 1))
    : 1

  await worker.value?.setSubWorker(count)
}

export const useWorker = () => {
  return useState<Comlink.Remote<GetCitiesMapWorkerType> | undefined>('worker', () => undefined)
}
