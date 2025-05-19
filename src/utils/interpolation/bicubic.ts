export const bicubic = (
  elevations: (Float32Array | null)[][],
  resultPixels: number,
  angle: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  correction: number,
  pixelsPerTile: number,
  b = 1 / 3,
  c = 1 / 3,
): Float32Array => {
  const output = new Float32Array(resultPixels * resultPixels)
  const cosTheta = Math.cos(-angle * Math.PI / 180)
  const sinTheta = Math.sin(-angle * Math.PI / 180)
  const halfSize = (resultPixels - correction) / 2 - (0.5 * (1 - correction))

  const wx = new Array<number>(4)
  const wy = new Array<number>(4)

  for (let yi = 0; yi < resultPixels; yi++) {
    for (let xi = 0; xi < resultPixels; xi++) {
      const posX = offsetX + scale * (cosTheta * (xi - halfSize) + sinTheta * (yi - halfSize))
      const posY = offsetY + scale * (cosTheta * (yi - halfSize) - sinTheta * (xi - halfSize))

      const ix = Math.floor(posX)
      const iy = Math.floor(posY)
      const tx = posX - ix
      const ty = posY - iy

      wx[0] = cubicBC(1 + tx, b, c)
      wx[1] = cubicBC(tx, b, c)
      wx[2] = cubicBC(1 - tx, b, c)
      wx[3] = cubicBC(2 - tx, b, c)
      wy[0] = cubicBC(1 + ty, b, c)
      wy[1] = cubicBC(ty, b, c)
      wy[2] = cubicBC(1 - ty, b, c)
      wy[3] = cubicBC(2 - ty, b, c)

      let sum = 0
      for (let m = -1; m <= 2; m++) {
        const gy = iy + m
        const tyTile = Math.floor(gy / pixelsPerTile)
        let ly = gy - tyTile * pixelsPerTile
        ly = (ly % pixelsPerTile + pixelsPerTile) % pixelsPerTile

        for (let n = -1; n <= 2; n++) {
          const gx = ix + n
          const txTile = Math.floor(gx / pixelsPerTile)
          let lx = gx - txTile * pixelsPerTile
          lx = (lx % pixelsPerTile + pixelsPerTile) % pixelsPerTile

          const tile = elevations[tyTile]?.[txTile]
          const val = tile ? tile[ly * pixelsPerTile + lx] : 0
          sum += wx[n + 1] * wy[m + 1] * val
        }
      }

      output[yi * resultPixels + xi] = sum
    }
  }

  return output
}

/** Cubic convolution kernel */
function cubicBC(x: number, b: number, c: number): number {
  const ax = Math.abs(x)
  if (ax < 1) {
    return ((12 - 9 * b - 6 * c) * ax ** 3 + (-18 + 12 * b + 6 * c) * ax ** 2 + (6 - 2 * b)) / 6
  } else if (ax < 2) {
    return ((-b - 6 * c) * ax ** 3 + (6 * b + 30 * c) * ax ** 2 + (-12 * b - 48 * c) * ax + (8 * b + 24 * c)) / 6
  }
  return 0
}
