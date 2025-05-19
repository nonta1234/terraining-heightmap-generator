export const scaleDownWorldMap = (data0: Float32Array, data1: Float32Array) => {
  const dataLength = data0.length + data1.length

  const data = new Float32Array(dataLength)
  data.set(data0)
  data.set(data1, data0.length)

  const result = new Float32Array(16777216)   // 4096^2
  const width = 16384

  for (let y = 0; y < 4096; y++) {
    const baseIndex = y * 4 * width
    const resultIndex = y * 4096
    for (let x = 0; x < 4096; x++) {
      const index = baseIndex + x * 4
      result[resultIndex + x] = (
        data[index + width + 1]
        + data[index + width + 2]
        + data[index + 2 * width + 1]
        + data[index + 2 * width + 2]
      ) * 0.25
    }
  }

  return result
}
