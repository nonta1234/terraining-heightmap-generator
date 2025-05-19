import { normalizedRandom } from '~/utils/normalizedRandom'

const calculateGradient = (data: Float32Array, size: number, x: number, y: number): { gradX: number, gradY: number } => {
  const index = (y + 1) * size + x + 1
  const gradX = (data[index + 1] - data[index - 1]) / 2
  const gradY = (data[index + size] - data[index - size]) / 2
  return { gradX, gradY }
}

const subdivideData = (data: Float32Array, padOutput: boolean, margin: number, noise: number) => {
  const padding = 4
  const size = Math.sqrt(data.length)
  const coreSize = size - padding * 2
  const verticesSize = coreSize + 5
  const gradientVectorSize = verticesSize + 1
  const resultSize = padOutput ? (coreSize + padding) * 2 : coreSize * 2
  const resultIndices = padOutput ? coreSize + padding : coreSize
  const gradientVectors = Array.from({ length: gradientVectorSize * gradientVectorSize }, () => ({ gradX: 0, gradY: 0 }))
  const vertices = new Float32Array(verticesSize * verticesSize)
  const output = new Float32Array(resultSize * resultSize)

  for (let y = 0; y < gradientVectorSize; y++) {
    for (let x = 0; x < gradientVectorSize; x++) {
      gradientVectors[y * gradientVectorSize + x] = calculateGradient(data, size, x, y)
    }
  }

  for (let y = 0; y < verticesSize; y++) {
    for (let x = 0; x < verticesSize; x++) {
      const gvIndex = y * gradientVectorSize + x
      const dataIndex = (y + 1) * size + x + 1

      const data00 = data[dataIndex]
      const data01 = data[dataIndex + 1]
      const data10 = data[dataIndex + size]
      const data11 = data[dataIndex + size + 1]

      const e00 = data00 + gradientVectors[gvIndex].gradX * 0.5 + gradientVectors[gvIndex].gradY * 0.5
      const e01 = data01 - gradientVectors[gvIndex + 1].gradX * 0.5 + gradientVectors[gvIndex + 1].gradY * 0.5
      const e10 = data10 + gradientVectors[gvIndex + gradientVectorSize].gradX * 0.5 - gradientVectors[gvIndex + gradientVectorSize].gradY * 0.5
      const e11 = data11 - gradientVectors[gvIndex + gradientVectorSize + 1].gradX * 0.5 - gradientVectors[gvIndex + gradientVectorSize + 1].gradY * 0.5

      const d00 = Math.abs(data01 - data00)
      const d01 = Math.abs(data11 - data01)
      const d10 = Math.abs(data00 - data10)
      const d11 = Math.abs(data10 - data11)
      const d02 = Math.abs(data10 - data01)
      const d03 = Math.abs(data11 - data00)

      const tri = (d00 + d01 + d10 + d11 + d02 + d03) / 6
      const min = Math.min(e00, e01, e10, e11) - tri * margin
      const max = Math.max(e00, e01, e10, e11) + tri * margin
      const averageH = (e00 + e01 + e10 + e11) * 0.25
      const noiseValue = noise > 0 && tri > 0 ? normalizedRandom() * 0.5 * tri * noise : 0

      vertices[y * verticesSize + x] = Math.min(Math.max(averageH + noiseValue, min), max)
    }
  }

  const verticesOffset = padOutput ? 0 : 2
  const dataOffset = padOutput ? 2 : 4

  for (let y = 0; y < resultIndices; y++) {
    for (let x = 0; x < resultIndices; x++) {
      const centerValue = data[(y + dataOffset) * size + x + dataOffset]
      const verticesIndex = (y + verticesOffset) * verticesSize + x + verticesOffset
      const resultIndex = y * 2 * resultSize + x * 2

      const v00 = vertices[verticesIndex]
      const v01 = vertices[verticesIndex + 1]
      const v10 = vertices[verticesIndex + verticesSize]
      const v11 = vertices[verticesIndex + verticesSize + 1]

      output[resultIndex] = (v00 + centerValue) * 0.5
      output[resultIndex + 1] = (v01 + centerValue) * 0.5
      output[resultIndex + resultSize] = (v10 + centerValue) * 0.5
      output[resultIndex + resultSize + 1] = (v11 + centerValue) * 0.5
    }
  }

  return output
}

export const subdivideTile = (data: Float32Array, count: number, margin: number, enhance: number, damping: number) => {
  let result = data

  for (let i = 0; i < count; i++) {
    const noise = enhance * ((1 - damping) ** i)
    result = subdivideData(result, i !== count - 1, margin, noise)
  }

  return result
}
