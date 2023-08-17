export const useDebug = () => {
  const debugMode: Ref<boolean> = useState('debug', () => false)

  const updateDebugMode = (debugMode: Ref<boolean>) => (value: boolean) => {
    debugMode.value = value
  }

  return {
    debugMode: readonly(debugMode),
    updateDebugMode: updateDebugMode(debugMode),
  }
}
