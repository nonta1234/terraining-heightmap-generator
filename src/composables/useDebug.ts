import { viewModes } from '~/types/types'

function parseBoolean(str: string): boolean {
  const lowercaseStr = str.toLowerCase()
  return lowercaseStr === 'true'
}

export const useDebug = () => {
  const debugMode: Ref<boolean> = useState('debug', () => false)
  const updateDebugMode = (debugMode: Ref<boolean>) => (value: boolean | string) => {
    if (typeof value === 'boolean') {
      debugMode.value = value
    } else {
      debugMode.value = parseBoolean(value)
    }
  }
  return {
    debugMode: readonly(debugMode),
    updateDebugMode: updateDebugMode(debugMode),
  }
}

export const useViewMode = () => {
  const viewMode: Ref<string> = useState('view', () => 'world')
  const updateViewMode = (viewMode: Ref<string>) => (value: string) => {
    if (viewModes.includes(value as any)) {
      viewMode.value = value
    } else {
      viewMode.value = 'world'
    }
  }
  return {
    viewMode: readonly(viewMode),
    updateViewMode: updateViewMode(viewMode),
  }
}
