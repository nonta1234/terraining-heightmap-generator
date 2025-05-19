/**
 * Generates a random number following a modified normal distribution.
 * The result is scaled to be within the range of -1 to 1.
 *
 * @returns A random number in the range [-1, 1] with a bell curve distribution
 */
export function normalizedRandom(): number {
  // Define coefficients as arrays
  const a: number[] = [2.50662823884, -18.61500062529, 41.39119773534, -25.44106049637]
  const b: number[] = [-8.47351093090, 23.08336743743, -21.06224101826, 3.13082909833]
  const c: number[] = [
    0.3374754822726147, 0.9761690190917186, 0.1607979714918209,
    0.0276438810333863, 0.0038405729373609, 0.0003951896511919,
    0.0000321767881768, 0.0000002888167364, 0.0000003960315187,
  ]

  let r: number

  // Keep trying until we get a value within acceptable range (-3 to 3)
  do {
    // Generate a uniform random number in range [0,1)
    // Ensure it's not exactly 0 to avoid issues with log functions
    let u = Math.random()
    // Extremely small probability safety check
    if (u === 0) {
      u = Number.EPSILON // Use smallest possible positive value to avoid log(0)
    }

    const v = u - 0.5
    let w

    if (v > -0.42 && v < 0.42) {
      const vv = v * v
      r = v * (((a[3] * vv + a[2]) * vv + a[1]) * vv + a[0])
      / ((((b[3] * vv + b[2]) * vv + b[1]) * vv + b[0]) * vv + 1.0)
    } else {
      if (v > 0) {
        w = Math.log(-Math.log(1 - u))
      } else {
        w = Math.log(-Math.log(u))
      }

      r = (((((((c[8] * w + c[7]) * w + c[6]) * w + c[5]) * w + c[4]) * w + c[3]) * w + c[2]) * w + c[1]) * w + c[0]

      if (v < 0) {
        r = -r
      }
    }
  } while (r < -3 || r > 3) // Approximately 0.27% chance of this happening

  // Scale r to be within -1 to 1 range
  return r / 3
}
