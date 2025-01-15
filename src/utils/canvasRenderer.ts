import { Model } from '@luma.gl/engine'
import { Buffer, clear, Texture2D } from '@luma.gl/webgl'

export const renderCanvas = (
  canvas: HTMLCanvasElement,
  gl: WebGL2RenderingContext,
  data: Float32Array,
  min: number,
  max: number,
  scale: number,
) => {
  const size = Math.sqrt(data.length)
  canvas.width = size
  canvas.height = size
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)

  const texture = new Texture2D(gl, {
    data: data,
    width: size,
    height: size,
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

  const positionBuffer = new Buffer(
    gl,
    new Float32Array([
      -1, -1,
      -1, 1,
      1, 1,
      1, 1,
      1, -1,
      -1, -1,
    ]),
  )

  const model = new Model(gl, {
    vs: `#version 300 es
      precision highp float;
      in vec2 position;
      out vec2 vTexCoord;
      void main() {
          vTexCoord = vec2((position.x + 1.0) * 0.5, 1.0 - 0.5 * (position.y + 1.0));
          gl_Position = vec4(position.x, position.y, 0.0, 1.0);
      }
    `,
    fs: `#version 300 es
      precision highp float;
      in vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uMin;
      uniform float uMax;
      uniform float uScale;
      out vec4 fragColor;
      void main() {
          float elevation = texture(uTexture, vTexCoord).r;
          float normalizedElevation = (elevation - uMin) / (uMax - uMin) * uScale;
          normalizedElevation = clamp(normalizedElevation, 0.0, 1.0);
          fragColor = vec4(normalizedElevation, normalizedElevation, normalizedElevation, 1.0);
      }
    `,
    uniforms: {
      uTexture: texture,
      uMin: min,
      uMax: max,
      uScale: scale,
    },
    attributes: {
      position: positionBuffer,
    },
    vertexCount: 6,
  })

  clear(gl, { color: [0, 0, 0, 1] })
  model.draw()

  texture.delete()
  positionBuffer.delete()
  model.delete()
}
