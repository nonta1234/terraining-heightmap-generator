export const extractMap = (data: Float32Array, startX: number, startY: number, cropSize: number) => {
  const imageSize = Math.sqrt(data.length)
  const result = new Float32Array(cropSize * cropSize)
  for (let y = 0; y < cropSize; y++) {
    const originalStartIndex = (startY + y) * imageSize + startX
    const cropStartIndex = y * cropSize
    result.set(data.subarray(originalStartIndex, originalStartIndex + cropSize), cropStartIndex)
  }
  return result
}

export const extractMapCS2 = (data0: Float32Array, data1: Float32Array, startX: number, startY: number, cropSize: number) => {
  const dataLength = data0.length + data1.length
  const data = new Float32Array(dataLength)
  data.set(data0)
  data.set(data1, data0.length)

  const imageSize = Math.sqrt(dataLength)
  const result = new Float32Array(cropSize * cropSize)
  for (let y = 0; y < cropSize; y++) {
    const originalStartIndex = (startY + y) * imageSize + startX
    const cropStartIndex = y * cropSize
    result.set(data.subarray(originalStartIndex, originalStartIndex + cropSize), cropStartIndex)
  }
  return result
}
