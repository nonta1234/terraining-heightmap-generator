use wasm_bindgen::prelude::*;

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
pub fn extract_tile(
    input_ptr: *const f32,
    output_ptr: *mut f32,
    size: usize,
    overlap: usize,
    tile: usize,
) {
    let correction = size % 2;
    let half_size = size / 2;
    let tile_size = half_size + overlap + correction;
    let offset = half_size - overlap;

    let input = unsafe { std::slice::from_raw_parts(input_ptr, size * size) };
    let output = unsafe { std::slice::from_raw_parts_mut(output_ptr, tile_size * tile_size) };

    let (start_x, start_y) = match tile {
        0 => (0, 0),
        1 => (offset, 0),
        2 => (0, offset),
        3 => (offset, offset),
        _ => return,
    };

    for y in 0..tile_size {
        let src_start = (start_y + y) * size + start_x;
        let dst_start = y * tile_size;
        output[dst_start..dst_start + tile_size]
            .copy_from_slice(&input[src_start..src_start + tile_size]);
    }
}

#[wasm_bindgen]
pub fn scale_up_bicubic(input_ptr: *const f32, output_ptr: *mut f32) {
    const ORIGINAL_SIZE: usize = 4096;
    const PADDING: usize = 100;
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
        for x in 0..OUTPUT_SIZE {
            let pos_x = x as f32 / SCALE as f32;
            let pos_y = y as f32 / SCALE as f32;

            let x0 = pos_x.floor() as usize + PADDING;
            let y0 = pos_y.floor() as usize + PADDING;
            let tx = pos_x - pos_x.floor();
            let ty = pos_y - pos_y.floor();

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

            output[(y + PADDING) * OUTPUT_SIZE + (x + PADDING)] = 
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
