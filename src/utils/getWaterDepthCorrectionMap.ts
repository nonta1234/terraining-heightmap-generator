import type { Settings } from '~/types/types'
import { mapSpec } from '~/utils/const'
import Delaunator from 'delaunator'
import { getDepthCorrectionData } from '~/utils/depthCanvasRender'

export const getWaterDepthCorrectionMap = (
  settings: Settings,
  mapPixels: number,
) => {
  return new Promise<Float32Array>((resolve, reject) => {
    try {
      const padding = 100

      // generate only the actual area
      // 0 padding at the end
      const tmpSize = mapPixels + mapSpec[settings.gridInfo].correction - 20
      const coreSize = tmpSize - (padding * 2)
      const resultPixels = tmpSize % 2 === 0 ? tmpSize : tmpSize + 1

      const depthCanvas = new OffscreenCanvas(coreSize, coreSize)
      const gl = depthCanvas.getContext('webgl2', {
        depth: true,
        antialias: true,
      }) as WebGL2RenderingContext

      const delaunay = Delaunator.from(
        settings.depthPoints,
        point => point.x,
        point => point.y,
      )

      const depthsData = settings.depthPoints.map(point => point.depth)

      const positions = new Float32Array(delaunay.coords)
      const depths = new Float32Array(depthsData)
      const indices = new Uint32Array(delaunay.triangles)

      const coreData = getDepthCorrectionData(gl, positions, depths, indices, coreSize, coreSize)

      for (let i = 0; i < coreData.length; i++) {
        coreData[i] *= 100
      }

      const resultData = new Float32Array(resultPixels * resultPixels)

      // addd padding
      for (let y = 0; y < coreSize; y++) {
        const sourceStart = y * coreSize
        const targetStart = (y + padding) * resultPixels + padding
        resultData.set(coreData.subarray(sourceStart, sourceStart + coreSize), targetStart)
      }

      for (let y = 0; y < padding; y++) {
        const firstRow = resultData.subarray(
          padding * resultPixels,
          padding * resultPixels + resultPixels,
        )
        resultData.set(firstRow, y * resultPixels)

        const lastRow = resultData.subarray(
          (resultPixels - padding - 1) * resultPixels,
          (resultPixels - padding - 1) * resultPixels + resultPixels,
        )
        resultData.set(lastRow, (resultPixels - padding + y) * resultPixels)
      }

      for (let y = padding; y < resultPixels - padding; y++) {
        const leftValue = resultData[y * resultPixels + padding]
        resultData.fill(leftValue, y * resultPixels, y * resultPixels + padding)

        const rightValue = resultData[y * resultPixels + resultPixels - padding - 1]
        resultData.fill(rightValue, y * resultPixels + resultPixels - padding, (y + 1) * resultPixels)
      }

      resolve(resultData)
    } catch (error) {
      console.error('An error occurred in getWaterDepthCorrectionMap:', error)
      reject(error)
    }
  })
}
