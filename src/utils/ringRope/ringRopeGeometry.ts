import { MeshGeometry } from '@pixi/mesh'
import type { IPoint } from '@pixi/core'

type Point = {
  x: number,
  y: number,
}


export class RingRopeGeometry extends MeshGeometry {
  /** An array of points that determine the rope. */
  public points: IPoint[]

  /**
   * The width (i.e., thickness) of the rope.
   * @readonly
   */
  _width: number

  /**
   * @param width - The width (i.e., thickness) of the rope.
   * @param points - An array of {@link PIXI.Point} objects to construct this rope.
   */
  constructor(width = 200, points: IPoint[]) {
    if (points[0].equals(points[points.length - 1])) {
      points.pop()
    }

    super(new Float32Array(points.length * 4),
      new Float32Array(points.length * 4),
      new Uint16Array((points.length - 1) * 6))

    this.points = points
    this._width = width

    this.build()
  }

  /**
   * The width (i.e., thickness) of the rope.
   * @readonly
   */
  get width(): number {
    return this._width
  }

  /** Refreshes Rope indices and uvs */
  private build(): void {
    const points = this.points

    if (!points) { return }

    const vertexBuffer = this.getBuffer('aVertexPosition')
    const uvBuffer = this.getBuffer('aTextureCoord')
    const indexBuffer = this.getIndex()

    // if too little points, or texture hasn't got UVs set yet just move on.
    if (points.length < 3) {
      return
    }

    // if the number of points has changed we will need to recreate the arraybuffers
    if (vertexBuffer.data.length / 8 !== points.length) {
      vertexBuffer.data = new Float32Array(points.length * 8)
      uvBuffer.data = new Float32Array(points.length * 8)
      indexBuffer.data = new Uint16Array(points.length * 6)
    }

    const uvs = uvBuffer.data
    const indices = indexBuffer.data

    uvs[0] = 0
    uvs[1] = 0
    uvs[2] = 0
    uvs[3] = 1

    const total = points.length

    for (let i = 0; i < total; i++) {
      // time to do some smart drawing!
      const index = i * 8

      // stretch texture
      const start = i / total
      const end = (i + 1) / total

      uvs[index] = start
      uvs[index + 1] = 0
      uvs[index + 2] = start
      uvs[index + 3] = 1
      uvs[index + 4] = end
      uvs[index + 5] = 0
      uvs[index + 6] = end
      uvs[index + 7] = 1
    }

    let indexCount = 0

    for (let i = 0; i < total; i++) {
      const index = i * 4

      indices[indexCount++] = index
      indices[indexCount++] = index + 1
      indices[indexCount++] = index + 2

      indices[indexCount++] = index + 2
      indices[indexCount++] = index + 1
      indices[indexCount++] = index + 3
    }

    // ensure that the changes are uploaded
    uvBuffer.update()
    indexBuffer.update()

    this.updateVertices()
  }

  /** refreshes vertices of Rope mesh */
  public updateVertices(): void {
    //
    function normalize(vector: Point): Point {
      const perpLength = Math.sqrt((vector.x * vector.x) + (vector.y * vector.y))
      return {
        x: vector.x / perpLength,
        y: vector.y / perpLength,
      }
    }

    const points = this.points

    if (points.length < 3) {
      return
    }

    const vertices = this.buffers[0].data
    const total = points.length
    const halfWidth = this._width / 2

    for (let i = 0; i < total - 1; i++) {
      const point = points[i]
      const nextPoint = points[i + 1]
      const index = i * 8

      const nVec = normalize({ x: nextPoint.y - point.y, y: -(nextPoint.x - point.x) })
      const perp = { x: nVec.x * halfWidth,  y: nVec.y * halfWidth }

      vertices[index] = point.x + perp.x
      vertices[index + 1] = point.y + perp.y
      vertices[index + 2] = point.x - perp.x
      vertices[index + 3] = point.y - perp.y
      vertices[index + 4] = nextPoint.x + perp.x
      vertices[index + 5] = nextPoint.y + perp.y
      vertices[index + 6] = nextPoint.x - perp.x
      vertices[index + 7] = nextPoint.y - perp.y
    }

    const point = points[total - 1]
    const nextPoint = points[0]
    const index = (total - 1) * 8

    const nVec = normalize({ x: nextPoint.y - point.y, y: -(nextPoint.x - point.x) })
    const perp = { x: nVec.x * halfWidth,  y: nVec.y * halfWidth }

    vertices[index] = point.x + perp.x
    vertices[index + 1] = point.y + perp.y
    vertices[index + 2] = point.x - perp.x
    vertices[index + 3] = point.y - perp.y
    vertices[index + 4] = nextPoint.x + perp.x
    vertices[index + 5] = nextPoint.y + perp.y
    vertices[index + 6] = nextPoint.x - perp.x
    vertices[index + 7] = nextPoint.y - perp.y

    this.buffers[0].update()
  }

  public update(): void {
    this.updateVertices()
  }
}
