function sinc(x: number) {
  if (Math.abs(x) < Number.EPSILON) return 1
  const piX = Math.PI * x
  return Math.sin(piX) / piX
}

function lanczosKernel(x: number, a: number) {
  if (Math.abs(x) >= a) return 0
  return sinc(x) * sinc(x / a)
}

export const lanczos = (
  elevations: (Float32Array | null)[][],
  resultPixels: number,
  angle: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  correction: number,
  pixelsPerTile: number,
  a = 3,
) => {
  const output = new Float32Array(resultPixels * resultPixels)
  const cosTheta = Math.cos(-angle * Math.PI / 180)
  const sinTheta = Math.sin(-angle * Math.PI / 180)
  const halfSize = (resultPixels - correction) / 2 - (0.5 * (1 - correction))

  const tileRows = elevations.length
  const tileCols = elevations[0].length
  const totalWidth = tileCols * pixelsPerTile
  const totalHeight = tileRows * pixelsPerTile

  function getElevation(x: number, y: number): number {
    const ix = Math.floor(x)
    const iy = Math.floor(y)

    if (ix < 0 || iy < 0 || ix >= totalWidth || iy >= totalHeight) return 0

    const tileX = Math.floor(ix / pixelsPerTile)
    const tileY = Math.floor(iy / pixelsPerTile)
    const innerX = ix % pixelsPerTile
    const innerY = iy % pixelsPerTile

    const tile = elevations[tileY]?.[tileX]
    if (!tile) return 0

    return tile[innerY * pixelsPerTile + innerX]
  }

  for (let y = 0; y < resultPixels; y++) {
    for (let x = 0; x < resultPixels; x++) {
      const srcX = offsetX + scale * (cosTheta * (x - halfSize) + sinTheta * (y - halfSize))
      const srcY = offsetY + scale * (cosTheta * (y - halfSize) - sinTheta * (x - halfSize))

      let sum = 0
      let weightSum = 0

      for (let j = -a + 1; j <= a; j++) {
        const iy = Math.floor(srcY) + j
        const wy = lanczosKernel(srcY - iy, a)

        for (let i = -a + 1; i <= a; i++) {
          const ix = Math.floor(srcX) + i
          const wx = lanczosKernel(srcX - ix, a)
          const w = wx * wy
          const elevation = getElevation(ix, iy)
          sum += elevation * w
          weightSum += w
        }
      }

      const index = y * resultPixels + x
      output[index] = weightSum !== 0 ? sum / weightSum : 0
    }
  }

  return output
}
