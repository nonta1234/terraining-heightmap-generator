let lastTime = 0

const throttle = (fn: any, interval: number) => {
  return () => {
    const currentTime = Date.now()
    if (currentTime - lastTime >= interval) {
      fn()
      lastTime = currentTime
    }
  }
}

export default defineNuxtPlugin(() => {
  return {
    provide: {
      throttle,
    },
  }
})
