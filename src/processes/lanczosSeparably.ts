function lanczosKernel(x: number, a: number) {
  if (x === 0) return 1
  if (x < -a || x > a) return 0
  const pix = Math.PI * x
  return (a * Math.sin(pix) * Math.sin(pix / a)) / (pix * pix)
}

export const lanczosSeparably = (
  data: Float32Array,
  scale: number,
  a: number = 3,
) => {
  const srcSize = Math.sqrt(data.length)
  if (!Number.isInteger(srcSize)) {
    throw new Error('Input Float32Array is not a square.')
  }

  const dstSize = Math.max(1, Math.floor(srcSize * scale))
  const temp = new Float32Array(dstSize * srcSize)
  const result = new Float32Array(dstSize * dstSize)

  for (let y = 0; y < srcSize; y++) {
    for (let x = 0; x < dstSize; x++) {
      const srcX = (x + 0.5) / scale - 0.5
      const x0 = Math.floor(srcX)
      let sum = 0
      let weightSum = 0

      for (let i = x0 - a + 1; i <= x0 + a; i++) {
        if (i < 0 || i >= srcSize) continue
        const w = lanczosKernel(srcX - i, a)
        sum += data[y * srcSize + i] * w
        weightSum += w
      }

      temp[y * dstSize + x] = weightSum > 0 ? sum / weightSum : 0
    }
  }

  for (let y = 0; y < dstSize; y++) {
    const srcY = (y + 0.5) / scale - 0.5
    const y0 = Math.floor(srcY)

    for (let x = 0; x < dstSize; x++) {
      let sum = 0
      let weightSum = 0

      for (let j = y0 - a + 1; j <= y0 + a; j++) {
        if (j < 0 || j >= srcSize) continue
        const w = lanczosKernel(srcY - j, a)
        sum += temp[j * dstSize + x] * w
        weightSum += w
      }

      result[y * dstSize + x] = weightSum > 0 ? sum / weightSum : 0
    }
  }

  return result
}
