import { CanvasMeshRenderer } from '@pixi/canvas-mesh'
import { canvasUtils } from '@pixi/canvas-renderer'
import { DRAW_MODES, Texture } from '@pixi/core'

CanvasMeshRenderer.prototype.render = function(mesh) {
  const renderer = this.renderer
  const transform = mesh.worldTransform

  renderer.canvasContext.activeContext.globalAlpha = mesh.worldAlpha
  renderer.canvasContext.setBlendMode(mesh.blendMode)
  renderer.canvasContext.setContextTransform(transform, mesh.roundPixels)

  if (mesh.drawMode !== DRAW_MODES.TRIANGLES) {
    // @ts-ignore
    this._renderTriangleMesh(mesh)
  } else {
    // @ts-ignore
    this._renderTriangles(mesh)
  }
}

// @ts-ignore
CanvasMeshRenderer.prototype._renderDrawTriangle = function(mesh: Mesh, index0: number, index1: number, index2: number): void {
  const context = this.renderer.canvasContext.activeContext
  const vertices = mesh.geometry.buffers[0].data
  const { uvs, texture } = mesh

  if (!texture.valid) {
    return
  }
  const isTinted = mesh.tintValue !== 0xFFFFFF
  const base = texture.baseTexture
  const textureWidth = base.width
  const textureHeight = base.height

  // Invalidate texture if base texture was updated
  // either because mesh.texture or mesh.shader.texture was changed
  if (mesh._cachedTexture && mesh._cachedTexture.baseTexture !== base) {
    mesh._cachedTint = 0xFFFFFF
    mesh._cachedTexture?.destroy()
    mesh._cachedTexture = null
    mesh._tintedCanvas = null
  }

  if (isTinted) {
    if (mesh._cachedTint !== mesh.tintValue) {
      mesh._cachedTint = mesh.tintValue
      mesh._cachedTexture = mesh._cachedTexture || new Texture(base)
      mesh._tintedCanvas = canvasUtils.getTintedCanvas(
        { texture: mesh._cachedTexture },
        mesh.tintValue,
      )
    }
  }

  const textureSource = isTinted ? mesh._tintedCanvas : base.getDrawableSource()

  const u0 = uvs[index0] * base.width
  const u1 = uvs[index1] * base.width
  const u2 = uvs[index2] * base.width
  const v0 = uvs[index0 + 1] * base.height
  const v1 = uvs[index1 + 1] * base.height
  const v2 = uvs[index2 + 1] * base.height

  const x0 = vertices[index0]
  const x1 = vertices[index1]
  let x2 = vertices[index2]
  const y0 = vertices[index0 + 1]
  const y1 = vertices[index1 + 1]
  let y2 = vertices[index2 + 1]

  const screenPadding = mesh.canvasPadding / this.renderer.canvasContext.activeResolution

  if (screenPadding > 0) {
    const { a, b, c, d } = mesh.worldTransform

    const vecX = x2 - x0
    const vecY = y2 - y0

    const screenX = (a * vecX) + (c * vecY)
    const screenY = (b * vecX) + (d * vecY)
    const screenDist = Math.sqrt((screenX * screenX) + (screenY * screenY))

    const normX = screenX / screenDist
    const normY = screenY / screenDist

    x2 = x2 + (normX * screenPadding)
    y2 = y2 + (normY * screenPadding)
  }

  context.save()
  context.beginPath()

  context.moveTo(x0, y0)
  context.lineTo(x1, y1)
  context.lineTo(x2, y2)

  context.closePath()

  context.clip()

  // Compute matrix transform
  const delta = (u0 * v1) + (v0 * u2) + (u1 * v2) - (v1 * u2) - (v0 * u1) - (u0 * v2)
  const deltaA = (x0 * v1) + (v0 * x2) + (x1 * v2) - (v1 * x2) - (v0 * x1) - (x0 * v2)
  const deltaB = (u0 * x1) + (x0 * u2) + (u1 * x2) - (x1 * u2) - (x0 * u1) - (u0 * x2)
  const deltaC = (u0 * v1 * x2) + (v0 * x1 * u2) + (x0 * u1 * v2) - (x0 * v1 * u2) - (v0 * u1 * x2) - (u0 * x1 * v2)
  const deltaD = (y0 * v1) + (v0 * y2) + (y1 * v2) - (v1 * y2) - (v0 * y1) - (y0 * v2)
  const deltaE = (u0 * y1) + (y0 * u2) + (u1 * y2) - (y1 * u2) - (y0 * u1) - (u0 * y2)
  const deltaF = (u0 * v1 * y2) + (v0 * y1 * u2) + (y0 * u1 * v2) - (y0 * v1 * u2) - (v0 * u1 * y2) - (u0 * y1 * v2)

  context.transform(
    deltaA / delta,
    deltaD / delta,
    deltaB / delta,
    deltaE / delta,
    deltaC / delta,
    deltaF / delta,
  )
  context.drawImage(
    textureSource,
    0,
    0,
    textureWidth * base.resolution,
    textureHeight * base.resolution,
    0,
    0,
    textureWidth,
    textureHeight,
  )

  context.restore()
  this.renderer.canvasContext.invalidateBlendMode()
}
