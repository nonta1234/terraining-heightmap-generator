export const mergeTiles = (tiles: Float32Array[], resolution: number, padding: number) => {
  const divisions = Math.sqrt(tiles.length)
  const tileSize = Math.sqrt(tiles[0].length)
  const coreSize = resolution - padding * 2
  const dividedSize = Math.floor(coreSize / divisions)
  const startSize = dividedSize + padding
  const endSize = dividedSize + (coreSize % dividedSize)

  const result = new Float32Array(resolution * resolution)

  for (let row = 0; row < divisions; row++) {
    const height = row === 0 ? startSize : (row === divisions - 1 ? endSize : dividedSize)
    const startY = row * dividedSize + (row === 0 ? 0 : padding)
    const offsetY = row === 0 ? 0 : padding

    for (let col = 0; col < divisions; col++) {
      const width = col === 0 ? startSize : (col === divisions - 1 ? endSize : dividedSize)
      const startX = col * dividedSize + (col === 0 ? 0 : padding)
      const offsetX = col === 0 ? 0 : padding

      const tile = tiles[row * divisions + col]

      for (let y = 0; y < height; y++) {
        const subarrayStart = (y + offsetY) * tileSize + offsetX
        const subarrayEnd = subarrayStart + width
        result.set(tile.subarray(subarrayStart, subarrayEnd), (startY + y) * resolution + startX)
      }
    }
  }

  return result
}
