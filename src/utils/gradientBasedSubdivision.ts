export const addPadding = (data: Float32Array, padding: number) => {
  const size = Math.sqrt(data.length)
  const newSize = size + (padding * 2)
  const result = new Float32Array(newSize * newSize)

  const sourceStride = size
  const targetStride = newSize
  const targetOffset = padding * targetStride + padding

  for (let i = 0; i < size; i++) {
    const sourceRow = new Float32Array(data.buffer, i * sourceStride * 4, size)
    result.set(sourceRow, targetOffset + i * targetStride)
  }

  for (let i = 0; i < padding; i++) {
    const firstRow = new Float32Array(result.buffer, (padding * targetStride + padding) * 4, size)
    result.set(firstRow, i * targetStride + padding)
  }

  for (let i = 0; i < padding; i++) {
    const lastRow = new Float32Array(result.buffer, ((size + padding - 1) * targetStride + padding) * 4, size)
    result.set(lastRow, (size + padding + i) * targetStride + padding)
  }

  for (let i = 0; i < newSize; i++) {
    const leftValue = result[i * targetStride + padding]
    result.fill(leftValue, i * targetStride, i * targetStride + padding)

    const rightValue = result[i * targetStride + size + padding - 1]
    result.fill(rightValue, i * targetStride + size + padding, (i + 1) * targetStride)
  }

  return result
}

export const blurData = (data: Float32Array, k: number[]) => {
  const width = Math.sqrt(data.length)
  const height = width
  const temp = new Float32Array(data.length)
  const result = new Float32Array(data.length)
  const sum = k.reduce((a, b) => a + b, 0)
  const k0 = k[0] / sum
  const k1 = k[1] / sum
  const k2 = k[2] / sum
  const kEdge = (k[1] + k[0]) / sum

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width
    temp[rowOffset] = data[rowOffset] * kEdge + data[rowOffset + 1] * k2
  }

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width
    for (let x = 1; x < width - 1; x++) {
      const pos = rowOffset + x
      temp[pos] = data[pos - 1] * k0 + data[pos] * k1 + data[pos + 1] * k2
    }
  }

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width
    const x = width - 1
    temp[rowOffset + x] = data[rowOffset + x - 1] * k0 + data[rowOffset + x] * kEdge
  }

  for (let x = 0; x < width; x++) {
    result[x] = temp[x] * kEdge + temp[width + x] * k2
  }

  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width
    for (let x = 0; x < width; x++) {
      const pos = rowOffset + x
      result[pos] = temp[pos - width] * k0 + temp[pos] * k1 + temp[pos + width] * k2
    }
  }

  const lastRow = (height - 1) * width
  for (let x = 0; x < width; x++) {
    result[lastRow + x] = temp[lastRow - width + x] * k0 + temp[lastRow + x] * kEdge
  }

  return result
}

const subdivide = (elevation: Float32Array, bluredElevation: Float32Array, padding: number) => {
  // bluredElevation data is padded with 2
  const coreSize = Math.sqrt(elevation.length)
  const bluredElevSize = Math.sqrt(bluredElevation.length)

  if (coreSize !== bluredElevSize - padding * 2) {
    throw new Error('Invalid data size')
  }

  const vertexSize = coreSize + 1
  const resultSize = coreSize * 2
  const elevationVertex = new Float32Array(vertexSize * vertexSize)
  const result = new Float32Array(resultSize * resultSize)

  const windowBuffer = Array(4).fill(0).map(() => new Float32Array(4))

  const calculateVertexElevation = (window: Float32Array[]) => {
    const s0 = (window[1][1] - window[0][0]) / 2 + window[1][1]
    const s1 = (window[1][2] - window[0][3]) / 2 + window[1][2]
    const s2 = (window[2][1] - window[3][0]) / 2 + window[2][1]
    const s3 = (window[2][2] - window[3][3]) / 2 + window[2][2]

    const reference = (s0 + s1 + s2 + s3) / 4
    const range = (Math.max(s0, s1, s2, s3) - Math.min(s0, s1, s2, s3)) * 0.1259  // 0.1259 is -9.0dB for fBM noise
    const result = reference + (Math.random() * range - range / 2)

    return result
  }

  for (let y = 0; y < vertexSize; y++) {
    const rowOffset0 = y * bluredElevSize
    const rowOffset1 = (y + 1) * bluredElevSize
    const rowOffset2 = (y + 2) * bluredElevSize
    const rowOffset3 = (y + 3) * bluredElevSize

    for (let x = 0; x < vertexSize; x++) {
      windowBuffer[0].set(bluredElevation.subarray(rowOffset0 + x, rowOffset0 + x + 4))
      windowBuffer[1].set(bluredElevation.subarray(rowOffset1 + x, rowOffset1 + x + 4))
      windowBuffer[2].set(bluredElevation.subarray(rowOffset2 + x, rowOffset2 + x + 4))
      windowBuffer[3].set(bluredElevation.subarray(rowOffset3 + x, rowOffset3 + x + 4))
      elevationVertex[y * vertexSize + x] = calculateVertexElevation(windowBuffer)
    }
  }

  for (let y = 0; y < coreSize; y++) {
    const coreOffset = y * coreSize
    const vertexOffset0 = y * vertexSize
    const vertexOffset1 = (y + 1) * vertexSize
    const resultOffset0 = y * 2 * resultSize
    const resultOffset1 = (y * 2 + 1) * resultSize

    for (let x = 0; x < coreSize; x++) {
      result[resultOffset0 + x * 2] = (elevationVertex[vertexOffset0 + x] + elevation[coreOffset + x]) / 2
      result[resultOffset0 + x * 2 + 1] = (elevationVertex[vertexOffset0 + x + 1] + elevation[coreOffset + x]) / 2
      result[resultOffset1 + x * 2] = (elevationVertex[vertexOffset1 + x] + elevation[coreOffset + x]) / 2
      result[resultOffset1 + x * 2 + 1] = (elevationVertex[vertexOffset1 + x + 1] + elevation[coreOffset + x]) / 2
    }
  }

  return result
}

export const subdivideByGradient = (elevation: Float32Array, blurKernel: number[], count = 1) => {
  const padding = 2

  const recursiveSubdivide = (elev: Float32Array, index: number): Float32Array => {
    if (index <= 0) return elev
    const paddedElevation = addPadding(elev, padding)
    const bluredElevation = blurData(paddedElevation, blurKernel)
    return recursiveSubdivide(subdivide(elev, bluredElevation, padding), index - 1)
  }

  return recursiveSubdivide(elevation, count)
}
