use wasm_bindgen::prelude::*;
use rand::{rngs::SmallRng, Rng, SeedableRng};

#[wasm_bindgen]
pub fn allocate_memory(length: usize) -> *mut f32 {
    let mut buffer = Vec::with_capacity(length);
    unsafe { buffer.set_len(length) }
    let ptr = buffer.as_mut_ptr();
    std::mem::forget(buffer);
    ptr
}

#[wasm_bindgen]
pub fn free_memory(ptr: *mut f32, size: usize) {
    unsafe {
        let _ = Vec::from_raw_parts(ptr, size, size);
    }
}

#[wasm_bindgen]
pub fn scale_up_bicubic(input_ptr: *const f32, output_ptr: *mut f32) {
    const ORIGINAL_SIZE: usize = 4096;
    const PADDING: usize = 100;
    const SCALED_PADDING: usize = 75;
    const FULL_SIZE: usize = ORIGINAL_SIZE + 2 * PADDING;
    const SCALE: usize = 4;
    const NEW_SIZE: usize = ORIGINAL_SIZE * SCALE;
    const OUTPUT_SIZE: usize = NEW_SIZE + 2 * PADDING;

    // Mitchell-Netravali cubic filter parameters (b = 1/3, c = 1/3)
    let b = 1.0 / 3.0;
    let c = 1.0 / 3.0;
    let coeff = cubic_bc_coefficient(b, c);

    let input = unsafe { std::slice::from_raw_parts(input_ptr, FULL_SIZE * FULL_SIZE) };
    let output = unsafe { std::slice::from_raw_parts_mut(output_ptr, OUTPUT_SIZE * OUTPUT_SIZE) };

    for y in 0..OUTPUT_SIZE {
        let pos_y = y as f32 / SCALE as f32;
        let y0 = pos_y.floor() as usize + SCALED_PADDING;
        let ty = pos_y - pos_y.floor();

        for x in 0..OUTPUT_SIZE {
            let pos_x = x as f32 / SCALE as f32;
            let x0 = pos_x.floor() as usize + SCALED_PADDING;
            let tx = pos_x - pos_x.floor();

            let fx = [
                cubic_func(1.0 + tx, &coeff),
                cubic_func(tx, &coeff),
                cubic_func(1.0 - tx, &coeff),
                cubic_func(2.0 - tx, &coeff),
            ];
            
            let fy = [
                cubic_func(1.0 + ty, &coeff),
                cubic_func(ty, &coeff),
                cubic_func(1.0 - ty, &coeff),
                cubic_func(2.0 - ty, &coeff),
            ];

            let tmp_vals = [
                fy[0] * input[(y0 - 1) * FULL_SIZE + (x0 - 1)] + 
                fy[1] * input[y0 * FULL_SIZE + (x0 - 1)] + 
                fy[2] * input[(y0 + 1) * FULL_SIZE + (x0 - 1)] + 
                fy[3] * input[(y0 + 2) * FULL_SIZE + (x0 - 1)],

                fy[0] * input[(y0 - 1) * FULL_SIZE + x0] + 
                fy[1] * input[y0 * FULL_SIZE + x0] + 
                fy[2] * input[(y0 + 1) * FULL_SIZE + x0] + 
                fy[3] * input[(y0 + 2) * FULL_SIZE + x0],

                fy[0] * input[(y0 - 1) * FULL_SIZE + (x0 + 1)] + 
                fy[1] * input[y0 * FULL_SIZE + (x0 + 1)] + 
                fy[2] * input[(y0 + 1) * FULL_SIZE + (x0 + 1)] + 
                fy[3] * input[(y0 + 2) * FULL_SIZE + (x0 + 1)],

                fy[0] * input[(y0 - 1) * FULL_SIZE + (x0 + 2)] + 
                fy[1] * input[y0 * FULL_SIZE + (x0 + 2)] + 
                fy[2] * input[(y0 + 1) * FULL_SIZE + (x0 + 2)] + 
                fy[3] * input[(y0 + 2) * FULL_SIZE + (x0 + 2)],
            ];

            output[y * OUTPUT_SIZE + x] =
                fx[0] * tmp_vals[0] + fx[1] * tmp_vals[1] + 
                fx[2] * tmp_vals[2] + fx[3] * tmp_vals[3];
        }
    }
}

fn cubic_bc_coefficient(b: f32, c: f32) -> [f32; 8] {
    let p = 2.0 - 1.5 * b - c;
    let q = -3.0 + 2.0 * b + c;
    let r = 0.0;
    let s = 1.0 - (1.0 / 3.0) * b;
    let t = -(1.0 / 6.0) * b - c;
    let u = b + 5.0 * c;
    let v = -2.0 * b - 8.0 * c;
    let w = (4.0 / 3.0) * b + 4.0 * c;
    [p, q, r, s, t, u, v, w]
}

fn cubic_func(x: f32, coeff: &[f32; 8]) -> f32 {
    let ax = x.abs();
    if ax < 1.0 {
        ((coeff[0] * ax + coeff[1]) * ax + coeff[2]) * ax + coeff[3]
    } else if ax < 2.0 {
        ((coeff[4] * ax + coeff[5]) * ax + coeff[6]) * ax + coeff[7]
    } else {
        0.0
    }
}

fn add_padding(data: &[f32], padding: usize) -> Vec<f32> {
    let side = (data.len() as f32).sqrt() as usize;
    let mut padded_data = Vec::with_capacity((side + 2 * padding) * (side + 2 * padding));
    
    for _ in 0..padding {
        padded_data.extend(std::iter::repeat(data[0]).take(padding));
        padded_data.extend(&data[0..side]);
        padded_data.extend(std::iter::repeat(data[side-1]).take(padding));
    }
    
    for r in 0..side {
        padded_data.extend(std::iter::repeat(data[r * side]).take(padding));
        padded_data.extend(&data[r * side..(r + 1) * side]);
        padded_data.extend(std::iter::repeat(data[(r + 1) * side - 1]).take(padding));
    }
    
    for _ in 0..padding {
        padded_data.extend(std::iter::repeat(data[(side - 1) * side]).take(padding));
        padded_data.extend(&data[(side - 1) * side..side * side]);
        padded_data.extend(std::iter::repeat(data[side * side - 1]).take(padding));
    }
    
    padded_data
}

fn blur_data(data: &[f32], k: &[f32]) -> Vec<f32> {
    let width = (data.len() as f32).sqrt() as usize;
    let height = width;
    
    let sum = k.iter().sum::<f32>();
    let k = [
        k[0] / sum,
        k[1] / sum,
        k[2] / sum,
        (k[1] + k[0]) / sum  // k_edge
    ];
    
    let mut result = vec![0.0; data.len()];
    
    // Horizontal pass
    for y in 0..height {
        let row_offset = y * width;
        // Left edge
        result[row_offset] = data[row_offset] * k[3] + data[row_offset + 1] * k[2];
        // Middle
        for x in 1..width-1 {
            let pos = row_offset + x;
            result[pos] = data[pos - 1] * k[0] + data[pos] * k[1] + data[pos + 1] * k[2];
        }
        // Right edge
        let x = width - 1;
        result[row_offset + x] = data[row_offset + x - 1] * k[0] + data[row_offset + x] * k[3];
    }
    
    // Vertical pass (in-place modification)
    let temp = result.clone();
    
    // Top edge
    for x in 0..width {
        result[x] = temp[x] * k[3] + temp[width + x] * k[2];
    }

    // Middle rows
    for y in 1..height-1 {
        let row_offset = y * width;
        for x in 0..width {
            let pos = row_offset + x;
            result[pos] = temp[pos - width] * k[0] + temp[pos] * k[1] + temp[pos + width] * k[2];
        }
    }
    
    // Bottom edge
    let last_row = (height - 1) * width;
    for x in 0..width {
        result[last_row + x] = temp[last_row - width + x] * k[0] + temp[last_row + x] * k[3];
    }
    
    result
}

fn subdivide(elevation: &[f32], blured_elevation: &[f32], padding: usize) -> Vec<f32> {
    let core_size = (elevation.len() as f64).sqrt() as usize;
    let blured_elev_size = (blured_elevation.len() as f64).sqrt() as usize;

    if core_size != blured_elev_size - padding * 2 {
        panic!("Invalid data size");
    }

    let vertex_size = core_size + 1;
    let result_size = core_size * 2;
    let mut elevation_vertex = vec![0.0; vertex_size * vertex_size];
    let mut result = vec![0.0; result_size * result_size];

    let mut rng = SmallRng::from_entropy();

    let mut window_buffer = [[0.0; 4]; 4];

    let calculate_vertex_elevation = |window: &[[f32; 4]; 4], rng: &mut SmallRng| -> f32 {
        let s0 = (window[1][1] - window[0][0]) / 2.0 + window[1][1];
        let s1 = (window[1][2] - window[0][3]) / 2.0 + window[1][2];
        let s2 = (window[2][1] - window[3][0]) / 2.0 + window[2][1];
        let s3 = (window[2][2] - window[3][3]) / 2.0 + window[2][2];

        let reference = (s0 + s1 + s2 + s3) / 4.0;
        let range = (s0.max(s1).max(s2).max(s3) - s0.min(s1).min(s2).min(s3)) * 0.1259;
        reference + (rng.gen_range(-0.5, 0.5) * range)
    };

    for y in 0..vertex_size {
        let row_offset0 = y * blured_elev_size;
        let row_offset1 = (y + 1) * blured_elev_size;
        let row_offset2 = (y + 2) * blured_elev_size;
        let row_offset3 = (y + 3) * blured_elev_size;

        for x in 0..vertex_size {
            window_buffer[0].copy_from_slice(&blured_elevation[row_offset0 + x..row_offset0 + x + 4]);
            window_buffer[1].copy_from_slice(&blured_elevation[row_offset1 + x..row_offset1 + x + 4]);
            window_buffer[2].copy_from_slice(&blured_elevation[row_offset2 + x..row_offset2 + x + 4]);
            window_buffer[3].copy_from_slice(&blured_elevation[row_offset3 + x..row_offset3 + x + 4]);

            elevation_vertex[y * vertex_size + x] = calculate_vertex_elevation(&window_buffer, &mut rng);
        }
    }

    for y in 0..core_size {
        let core_offset = y * core_size;
        let vertex_offset0 = y * vertex_size;
        let vertex_offset1 = (y + 1) * vertex_size;
        let result_offset0 = y * 2 * result_size;
        let result_offset1 = (y * 2 + 1) * result_size;

        for x in 0..core_size {
            result[result_offset0 + x * 2] = (elevation_vertex[vertex_offset0 + x] + elevation[core_offset + x]) / 2.0;
            result[result_offset0 + x * 2 + 1] = (elevation_vertex[vertex_offset0 + x + 1] + elevation[core_offset + x]) / 2.0;
            result[result_offset1 + x * 2] = (elevation_vertex[vertex_offset1 + x] + elevation[core_offset + x]) / 2.0;
            result[result_offset1 + x * 2 + 1] = (elevation_vertex[vertex_offset1 + x + 1] + elevation[core_offset + x]) / 2.0;
        }
    }

    result
}

#[wasm_bindgen]
pub fn subdivide_by_gradient(
    elevation_ptr: *mut f32,
    elevation_len: usize,
    kernel: &[f32],
    count: usize,
) -> *mut f32 {
    let elevation = unsafe { std::slice::from_raw_parts(elevation_ptr, elevation_len) };
    let padding = 2;

    fn recursive_subdivide(elev: &[f32], kernel: &[f32], index: usize, padding: usize) -> Vec<f32> {
        if index == 0 {
            return elev.to_vec();
        }
        let padded_elevation = add_padding(elev, padding);
        let blured_elevation = blur_data(&padded_elevation, kernel);
        let subdivided = subdivide(elev, &blured_elevation, padding);
        recursive_subdivide(&subdivided, kernel, index - 1, padding)
    }

    let result = recursive_subdivide(elevation, kernel, count, padding);

    let result_ptr = allocate_memory(result.len());
    let result_slice = unsafe { std::slice::from_raw_parts_mut(result_ptr, result.len()) };
    result_slice.copy_from_slice(&result);

    result_ptr
}
