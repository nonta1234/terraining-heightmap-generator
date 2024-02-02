import { Mesh, MeshMaterial } from '@pixi/mesh'
import type { IPoint, Renderer, Texture } from '@pixi/core'
import { RingRopeGeometry } from '~/utils/ringRope/ringRopeGeometry'


export class RingRope extends Mesh {
  public autoUpdate: boolean

  constructor(texture: Texture, points: IPoint[]) {
    const ropeGeometry = new RingRopeGeometry(texture.height, points)
    const meshMaterial = new MeshMaterial(texture)

    // offset: adjusting the position of the mesh

    super(ropeGeometry, meshMaterial)

    /**
         * re-calculate vertices by rope points each frame
         * @member {boolean}
         */
    this.autoUpdate = true
  }

  _render(renderer: Renderer): void {
    const geometry: RingRopeGeometry = this.geometry as any

    if (this.autoUpdate || geometry._width !== this.shader.texture.height) {
      geometry._width = this.shader.texture.height
      geometry.update()
    }

    super._render(renderer)
  }
}
