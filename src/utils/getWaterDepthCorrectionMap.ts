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

      const resultData = new Float32Array(resultPixels * resultPixels)

      for (let y = 0; y < coreSize; y++) {
        for (let x = 0; x < coreSize; x++) {
          const originalIndex = y * coreSize + x
          const paddedIndex = (y + padding) * resultPixels + (x + padding)
          resultData[paddedIndex] = coreData[originalIndex] * 100
        }
      }

      resolve(resultData)
    } catch (error) {
      console.error('An error occurred in getWaterDepthCorrectionMap:', error)
      reject(error)
    }
  })
}
