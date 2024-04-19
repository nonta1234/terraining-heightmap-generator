import { definedProps, Mesh, RopeGeometry, type PointData, type Texture, type MeshOptions } from 'pixi.js'
import { RingRopeGeometry } from './ringRopeGeometry'


export interface RingRopeOptions extends Omit<MeshOptions, 'geometry'> {
  texture: Texture;
  points: PointData[];
  textureScale?: number;
}


export class RingRope extends Mesh {
  public static defaultOptions: Partial<RingRopeOptions> = {
    textureScale: 0.5,
  }

  public autoUpdate: boolean

  private _txScale: number

  constructor(options: RingRopeOptions) {
    const { texture, points, textureScale, ...rest } = { ...RingRope.defaultOptions, ...options }
    const ropeGeometry = new RingRopeGeometry(texture.height, points, textureScale!)

    super(definedProps({
      ...rest,
      texture,
      geometry: ropeGeometry,
    }))

    this.autoUpdate = true
    this._txScale = textureScale ?? RingRope.defaultOptions.textureScale!

    this.onRender = this._render
  }

  private _render(): void {
    const geometry: RopeGeometry = this.geometry as any

    if (this.autoUpdate || geometry._width !== this.texture.height * this._txScale) {
      geometry._width = this.texture.height * this._txScale
      geometry.update()
    }
  }
}
