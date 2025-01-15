import { Model } from '@luma.gl/engine'
import { Buffer, clear } from '@luma.gl/webgl'

const vs = `#version 300 es
  precision highp float;

  in vec2 positions;
  in float depths;

  out float vDepth;

  void main() {
      vDepth = depths / 100.0;
      gl_Position = vec4(positions.x * 2.0 - 1.0, 1.0 - positions.y * 2.0, 0.0, 1.0);
  }`

const fs = `#version 300 es
  precision highp float;

  in float vDepth;
  out vec4 fragColor;

  void main() {
      vec4 startColor = vec4(0.51, 0.74, 0.93, 0.0);
      vec4 endColor = vec4(0.33, 0.63, 0.9, 0.9);
      fragColor = mix(startColor, endColor, vDepth);
  }`

export const renderDepthCanvas = (
  canvas: HTMLCanvasElement,
  gl: WebGL2RenderingContext,
  positions: Float32Array,
  depths: Float32Array,
  indices: Uint32Array,
) => {
  const attributes = {
    positions: new Buffer(gl, {
      data: positions,
      accessor: {
        size: 2,
      },
    }),
    depths: new Buffer(gl, {
      data: depths,
      accessor: {
        size: 1,
      },
    }),
    indices: new Buffer(gl, {
      data: indices,
      target: gl.ELEMENT_ARRAY_BUFFER,
    }),
  }

  const model = new Model(gl, {
    vs,
    fs,
    attributes,
    drawMode: gl.TRIANGLES,
    vertexCount: indices.length,
  })

  clear(gl, { color: [0, 0, 0, 0], depth: true })
  model.draw()
  model.delete()
}
