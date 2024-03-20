import { Mesh, MeshMaterial } from '@pixi/mesh'
import type { IPoint, Renderer, Texture } from '@pixi/core'
import type { CanvasRenderer } from '@pixi/canvas-renderer'
import { RingRopeGeometry } from './ringRopeGeometry'
import './fixPadding'

export class RingRope extends Mesh {
  public autoUpdate: boolean

  _scale: number

  constructor(texture: Texture, points: IPoint[], scale = 0.5) {
    const ropeGeometry = new RingRopeGeometry(texture.height, points, scale)
    const meshMaterial = new MeshMaterial(texture)

    super(ropeGeometry, meshMaterial)

    this._scale = scale

    /**
     * re-calculate vertices by rope points each frame
     * @member {boolean}
     */
    this.autoUpdate = true
  }

  _render(renderer: Renderer): void {
    const geometry: RingRopeGeometry = this.geometry as any

    if (this.autoUpdate || geometry._width !== this.shader.texture.height * this._scale) {
      geometry._width = this.shader.texture.height * this._scale
      geometry.update()
    }

    super._render(renderer)
  }

  _renderCanvas(renderer: CanvasRenderer): void {
    const geometry: RingRopeGeometry = this.geometry as any
    if (this.autoUpdate || geometry._width !== this.shader.texture.height * this._scale) {
      geometry._width = this.shader.texture.height * this._scale
      geometry.update()
    }

    if (this.shader.update) {
      this.shader.update()
    }

    this.calculateUvs()

    this.material._renderCanvas(renderer, this)
  }
}
