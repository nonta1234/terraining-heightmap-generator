import { CreateGPGPU } from '~/utils/gpgpu'

const predefinedKernels: { [key: number]: number[] } = {
  3: [0.25, 0.5, 0.25],
  5: [0.0625, 0.25, 0.375, 0.25, 0.0625],
  7: [0.03125, 0.109375, 0.21875, 0.28125, 0.21875, 0.109375, 0.03125],
  9: [0.015625, 0.05078125, 0.1171875, 0.19921875, 0.234375, 0.19921875, 0.1171875, 0.05078125, 0.015625],
  11: [0.00881223, 0.02714358, 0.06511406, 0.12164907, 0.17699836, 0.20056541, 0.17699836, 0.12164907, 0.06511406, 0.02714358, 0.00881223],
}

const calculateSigma = (kSize: number): number => {
  return 0.3 * ((kSize - 1) * 0.5 - 1) + 0.8
}

const createGaussianKernel = (radius: number): number[] => {
  const kSize = 2 * radius + 1
  if (predefinedKernels[kSize]) {
    return predefinedKernels[kSize]
  }

  const sigma = calculateSigma(kSize)
  const kernel: number[] = []
  let sum = 0

  for (let i = -radius; i <= radius; i++) {
    const value = Math.exp(-(i * i) / (2 * sigma * sigma))
    kernel.push(value)
    sum += value
  }

  for (let i = 0; i < kernel.length; i++) {
    kernel[i] /= sum
  }

  return kernel
}


export const gaussianBlur = (imageData: Float32Array, width: number, height: number, radius: number) => {
  const kernel = createGaussianKernel(radius)
  const inputData = imageData
  const outputData = new Float32Array(imageData.length)

  const gpgpu = CreateGPGPU()

  const vertexShaderCode = `
    uniform sampler2D kernel;
    uniform int width;
    uniform int height;
    uniform int radius;
    in float input;
    out float output;
  
    void main(void) {
      ivec2 kernelSize = textureSize(kernel, 0);
      int y = gl_VertexID / width;
      int x = gl_VertexID % width;

      float sum = 0.0;
      for (int k = -radius; k <= radius; k++) {
        int posX = x + k
        posX = posX * sign(posX)
        if (posX >= width) { posX = 2 * width - posX - 1 }
        sum += image[this.thread.y * width + x] * kernel[k + radius]
      }

      C = A + B;
  }`

  // inputはダミー
  // 元データをTexture
  // カーネルは配列で


  const param = {
    id: 'GaussianBlur',
    vertexShader: vertexShaderCode,
    args: {
      kernel: gpgpu.makeTextureInfo('float', [1, kernel.length], kernel),
      width,
      height,
      radius,
      input: inputData,
      output: outputData,
    },
  }

  gpgpu.compute(param)
  return outputData
}


/**

export const gaussianBlur = (imageData: Float32Array, width: number, height: number, radius: number) => {
  const kernel = createGaussianKernel(radius)
  const data = ndarray(imageData, [width, height])
  const inputData = new Input()

  const horizontalBlur = gpu.createKernel(function(image: Float32Array, width: number, kernel: number[], radius: number) {
    let sum = 0
    for (let k = -radius; k <= radius; k++) {
      let x = this.thread.x + k
      if (x < 0) { x = -x }
      if (x >= width) { x = 2 * width - x - 1 }
      sum += image[this.thread.y * width + x] * kernel[k + radius]
    }
    return sum
  })
    .setOutput([width, height])


  const horizontalBlurred = horizontalBlur(new Input(data, [width, height]), width, kernel, radius)

  console.log(horizontalBlurred)

  const verticalBlur = gpu.createKernel(function(image: Float32Array, kernel: number[], radius: number) {
    let sum = 0
    for (let k = -radius; k <= radius; k++) {
      let y = this.thread.y + k
      if (y < 0) { y = -y }
      // @ts-ignore
      if (y >= this.constants.height) { y = 2 * this.constants.height - y - 1 }
      // @ts-ignore
      sum += image[y * this.constants.width + this.thread.x] * kernel[k + radius]
    }
    return sum
  })
    .setLoopMaxIterations(width * height)
    .setOutput([width, height])
    .setConstants({ width, height })

  const verticalBlurred = verticalBlur(horizontalBlurred, kernel, radius)

  return verticalBlurred
}

export const unsharpMask = (imageData: Float32Array, width: number, height: number, radius: number, amount: number): Float32Array => {
  const blurredImageData = gaussianBlur(imageData, width, height, radius)

  const computeDetails = gpu.createKernel(function(original: Float32Array, blurred: Float32Array, amount: number) {
    // @ts-ignore
    const index = this.thread.y * this.constants.width + this.thread.x
    return original[index] + amount * (original[index] - blurred[index])
  })
    .setOutput([width, height])
    .setConstants({ width, height })

  const detailedImageData = computeDetails(imageData, blurredImageData, amount) as unknown as Float32Array

  return detailedImageData
}
*/
