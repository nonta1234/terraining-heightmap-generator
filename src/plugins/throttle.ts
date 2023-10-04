const throttle = (fn: any, interval: number) => {
  let lastTime = 0

  return () => {
    const currentTime = Date.now()
    if (currentTime - lastTime >= interval) {
      lastTime = currentTime
      fn()
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
