import { Model } from '@luma.gl/engine'
import { Buffer, Texture2D, Framebuffer, clear } from '@luma.gl/webgl'

export const renderDepthCanvas = (
  gl: WebGL2RenderingContext,
  positions: Float32Array,
  depths: Float32Array,
  indices: Uint32Array,
  linePositions?: Float32Array,
) => {
  const vsTriangles = `#version 300 es
    precision highp float;
    in vec2 positions;
    in float depths;
    out float vDepth;

    void main() {
        vDepth = depths / 100.0;
        gl_Position = vec4(positions.x * 2.0 - 1.0, 1.0 - positions.y * 2.0, 0.0, 1.0);
    }`

  const fsvsTriangles = `#version 300 es
    precision highp float;
    in float vDepth;
    out vec4 fragColor;

    void main() {
        vec4 startColor = vec4(0.51, 0.74, 0.93, 0.0);
        vec4 endColor = vec4(0.33, 0.63, 0.9, 1.0);
        fragColor = mix(startColor, endColor, vDepth);
    }`

  const vsLines = `#version 300 es
    precision highp float;
    in vec2 positions;

    void main() {
        gl_Position = vec4(positions.x * 2.0 - 1.0, 1.0 - positions.y * 2.0, 0.0, 1.0);
    }`

  const fsLines = `#version 300 es
    precision highp float;
    out vec4 fragColor;

    void main() {
        fragColor = vec4(0.4, 0.5, 0.6, 1.0);
    }`

  const triangleAttributes = {
    positions: new Buffer(gl, { data: positions, accessor: { size: 2 } }),
    depths: new Buffer(gl, { data: depths, accessor: { size: 1 } }),
    indices: new Buffer(gl, { data: indices, target: gl.ELEMENT_ARRAY_BUFFER }),
  }

  const triangleModel = new Model(gl, {
    vs: vsTriangles,
    fs: fsvsTriangles,
    attributes: triangleAttributes,
    drawMode: gl.TRIANGLES,
    vertexCount: indices.length,
  })

  clear(gl, { color: [0, 0, 0, 0], depth: true })
  triangleModel.draw()

  if (linePositions) {
    const lineAttributes = {
      positions: new Buffer(gl, { data: linePositions, accessor: { size: 2 } }),
    }

    const lineModel = new Model(gl, {
      vs: vsLines,
      fs: fsLines,
      attributes: lineAttributes,
      drawMode: gl.LINES,
      vertexCount: linePositions.length / 2,
    })

    lineModel.draw()
    lineModel.delete()
  }

  triangleModel.delete()
}

export const getDepthCorrectionData = (
  gl: WebGL2RenderingContext,
  positions: Float32Array,
  depths: Float32Array,
  indices: Uint32Array,
  width: number,
  height: number,
) => {
  if (!gl.getExtension('EXT_color_buffer_float')) {
    throw new Error('EXT_color_buffer_float extension is not supported')
  }

  const vs = `#version 300 es
    precision highp float;
    in vec2 positions;
    in float depths;
    out float vDepth;
    
    void main() {
        vDepth = depths / 100.0;
        gl_Position = vec4(positions.x * 2.0 - 1.0, positions.y * 2.0 - 1.0, 0.0, 1.0);
    }`

  const fs = `#version 300 es
    precision highp float;
    in float vDepth;
    out vec4 fragColor;
  
    void main() {
        fragColor = vec4(vDepth, vDepth, vDepth, 1.0);
    }`

  const texture = new Texture2D(gl, {
    width,
    height,
    format: gl.R32F,
    type: gl.FLOAT,
    mipmaps: false,
    parameters: {
      [gl.TEXTURE_MIN_FILTER]: gl.NEAREST,
      [gl.TEXTURE_MAG_FILTER]: gl.NEAREST,
      [gl.TEXTURE_WRAP_S]: gl.CLAMP_TO_EDGE,
      [gl.TEXTURE_WRAP_T]: gl.CLAMP_TO_EDGE,
    },
  })

  const framebuffer = new Framebuffer(gl, {
    width,
    height,
    attachments: {
      [gl.COLOR_ATTACHMENT0]: texture,
    },
  })

  const attributes = {
    positions: new Buffer(gl, { data: positions, accessor: { size: 2 } }),
    depths: new Buffer(gl, { data: depths, accessor: { size: 1 } }),
    indices: new Buffer(gl, { data: indices, target: gl.ELEMENT_ARRAY_BUFFER }),
  }

  const model = new Model(gl, {
    vs,
    fs,
    attributes,
    drawMode: gl.TRIANGLES,
    vertexCount: indices.length,
  })

  framebuffer.bind()
  clear(gl, { color: [0, 0, 0, 0], depth: true })
  gl.viewport(0, 0, width, height)
  model.draw()

  const resultData = new Float32Array(width * height)
  gl.readPixels(0, 0, width, height, gl.RED, gl.FLOAT, resultData)

  model.delete()
  framebuffer.delete()
  texture.delete()

  return resultData
}
