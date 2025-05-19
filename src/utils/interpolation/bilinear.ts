export const bilinear = (
  elevations: (Float32Array | null)[][],
  resultPixels: number,
  angle: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  correction: number,
  pixelsPerTile: number,
) => {
  const output = new Float32Array(resultPixels * resultPixels)
  const cosTheta = Math.cos(-angle * Math.PI / 180)
  const sinTheta = Math.sin(-angle * Math.PI / 180)
  const halfSize = (resultPixels - correction) / 2 - (0.5 * (1 - correction))

  // affine transformation & bilinear interpolation
  for (let y = 0; y < resultPixels; y++) {
    for (let x = 0; x < resultPixels; x++) {
      const posX = offsetX + scale * (cosTheta * (x - halfSize) + sinTheta * (y - halfSize))
      const posY = offsetY + scale * (cosTheta * (y - halfSize) - sinTheta * (x - halfSize))

      const tileX0 = Math.floor(posX / pixelsPerTile)
      const tileY0 = Math.floor(posY / pixelsPerTile)
      const localX = posX % pixelsPerTile
      const localY = posY % pixelsPerTile

      const x0 = Math.floor(localX)
      const y0 = Math.floor(localY)
      const x1 = (x0 + 1) % pixelsPerTile
      const y1 = (y0 + 1) % pixelsPerTile

      const tileX1 = (x1 < x0) ? tileX0 + 1 : tileX0
      const tileY1 = (y1 < y0) ? tileY0 + 1 : tileY0

      // tileYX
      const tile00 = elevations[tileY0][tileX0]
      const tile01 = elevations[tileY0][tileX1]
      const tile10 = elevations[tileY1][tileX0]
      const tile11 = elevations[tileY1][tileX1]

      const dX = localX - x0
      const dY = localY - y0
      const eX = 1 - dX
      const eY = 1 - dY

      const val = eX * eY * tile00![y0 * pixelsPerTile + x0]
        + dX * eY * tile01![y0 * pixelsPerTile + x1]
        + eX * dY * tile10![y1 * pixelsPerTile + x0]
        + dX * dY * tile11![y1 * pixelsPerTile + x1]

      output[y * resultPixels + x] = val
    }
  }

  return output
}
