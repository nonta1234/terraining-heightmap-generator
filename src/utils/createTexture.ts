function catmull(t: number, p0: number, p1: number, p2: number, p3: number) {
  return 0.5 * ((2 * p1) + (-p0 + p2) * t
    + (2 * p0 - 5 * p1 + 4 * p2 - p3) * (t ** 2)
    + (-p0 + 3 * p1 - 3 * p2 + p3) * (t ** 3))
}

function getStartPos(stop: number) {
  return Math.round(stop) + 0.5
}

function getEndPos(stop: number) {
  return Math.round(stop) - 0.5
}

/**
 * Create a texture for the waterside slope.
 * @param slope Number array of slopes as source
 * @param pixelSize Slope pixel size
 * @param ctx Context for internal use
 */
export const createSlopeTexture = (slope: number[], pixelSize: number, ctx: OffscreenCanvasRenderingContext2D) => {
  const pixels = Math.ceil(pixelSize)

  ctx.canvas.width = 1
  ctx.canvas.height = pixels * 2
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  const stopPosition: number[] = []
  const offset = pixels - pixelSize
  const amount = pixelSize / 10

  stopPosition.push(offset - amount)
  stopPosition.push(offset)

  for (let i = 0; i < slope.length; i++) {
    stopPosition.push((i + 1) * amount + offset)
  }

  stopPosition.push(pixels)
  stopPosition.push(pixels + amount)

  const stopValue = [
    slope[0],
    0,
    ...slope,
    1,
    slope[slope.length - 1],
  ]

  for (let i = 1; i < stopPosition.length - 2; i++) {
    const startPos = getStartPos(stopPosition[i])
    const endPos = getEndPos(stopPosition[i + 1])
    const range = stopPosition[i + 1] - stopPosition[i]

    for (let j = startPos; j <= endPos; j += 1) {
      const t = (j - stopPosition[i]) / range
      const value = catmull(t, stopValue[i - 1], stopValue[i], stopValue[i + 1], stopValue[i + 2]) * 255
      const colorValue = Math.round(Math.max(Math.min(value, 255), 0))
      ctx.fillStyle = `rgb(${colorValue}, ${colorValue}, ${colorValue})`
      ctx.fillRect(0, Math.floor(j), 1, 1)
      ctx.fillRect(0, ctx.canvas.height - Math.floor(j) - 1, 1, 1)
    }
  }
}

/**
 * Create a corner texture for the waterside slope.
 * @param slope Number array of slopes as source
 * @param pixelSize Slope pixel size
 * @param ctx Context for internal use
 */
export const createRadialTexture = (slope: number[], pixelSize: number, ctx: OffscreenCanvasRenderingContext2D) => {
  const pixels = Math.ceil(pixelSize)

  ctx.canvas.width = pixels * 2
  ctx.canvas.height = pixels * 2

  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  const stopPosition: number[] = []
  const offset = pixels - pixelSize
  const amount = pixelSize / 10

  stopPosition.push(offset - amount)
  stopPosition.push(offset)

  for (let i = 0; i < slope.length; i++) {
    stopPosition.push((i + 1) * amount + offset)
  }

  stopPosition.push(pixels)
  stopPosition.push(pixels + amount)

  const stopValue = [
    slope[0],
    0,
    ...slope,
    1,
    slope[slope.length - 1],
  ]

  for (let i = 1; i < stopPosition.length - 2; i++) {
    const startPos = getStartPos(stopPosition[i])
    const endPos = getEndPos(stopPosition[i + 1])
    const range = stopPosition[i + 1] - stopPosition[i]

    for (let j = startPos; j <= endPos; j += 1) {
      const t = (j - stopPosition[i]) / range
      const value = catmull(t, stopValue[i - 1], stopValue[i], stopValue[i + 1], stopValue[i + 2]) * 255
      const colorValue = Math.round(Math.max(Math.min(value, 255), 0))

      ctx.fillStyle = `rgb(${colorValue}, ${colorValue}, ${colorValue})`
      ctx.beginPath()
      ctx.arc(pixels, pixels, pixels - Math.floor(j), 0, 2 * Math.PI)
      ctx.fill()
    }
  }
}
