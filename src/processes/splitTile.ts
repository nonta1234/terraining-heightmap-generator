export const splitTile = async (data: Float32Array, divisions: number, padding: number) => {
  const size = Math.sqrt(data.length)
  const coreSize = size - padding * 2
  const dividedSize = Math.floor(coreSize / divisions)
  const correction = coreSize % dividedSize
  let tileSize = dividedSize + padding * 2 + correction

  // for FFT processing, the output size must be an even number
  if (tileSize % 2 === 1) {
    tileSize += 1
  }

  const result: Float32Array[] = new Array(divisions * divisions)
  const promises: Promise<void>[] = []

  const copyTile = (dst: Float32Array, startX: number, startY: number) => {
    for (let y = 0; y < tileSize; y++) {
      const srcStart = (startY + y) * size + startX
      const dstStart = y * tileSize
      dst.set(data.subarray(srcStart, srcStart + tileSize), dstStart)
    }
  }

  for (let row = 0; row < divisions; row++) {
    const startY = row * dividedSize
    for (let col = 0; col < divisions; col++) {
      const dst = new Float32Array(tileSize * tileSize)
      const startX = col * dividedSize
      const index = row * divisions + col

      const copyPromise = new Promise<void>((resolve) => {
        copyTile(dst, startX, startY)
        resolve()
      })

      promises.push(
        copyPromise.then(() => {
          result[index] = dst
        }),
      )
    }
  }

  await Promise.all(promises)
  return result
}
