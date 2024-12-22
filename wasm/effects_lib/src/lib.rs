use wasm_bindgen::prelude::*;
use std::sync::{Arc, Mutex};
use rustfft::{num_complex::Complex, FftPlanner};
use rand::{rngs::SmallRng, Rng, SeedableRng};
use rayon::prelude::*;

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
pub fn gaussian_blur(input_ptr: *mut f32, output_ptr: *mut f32, length: usize, radius: f32, blend_factor: f32, threshold: f32, fade: f32) {
    let size = (length as f32).sqrt() as usize;

    let input_slice = unsafe { std::slice::from_raw_parts(input_ptr, length) };
    let output_slice = unsafe { std::slice::from_raw_parts_mut(output_ptr, length) };

    let mut planner = FftPlanner::new();
    let fft = planner.plan_fft_forward(length);
    let ifft = planner.plan_fft_inverse(length);

    let mut input_complex: Vec<Complex<f32>> = (0..length)
        .into_par_iter()
        .map(|i| Complex::new(input_slice[i], 0.0))
        .collect();
    fft.process(&mut input_complex);

    let mut kernel = generate_gaussian_kernel(size, radius);
    fft_shift_2d(&mut kernel, size);
    fft.process(&mut kernel);

    input_complex.par_iter_mut()
        .zip(kernel.par_iter())
        .for_each(|(i, &k)| {
            *i *= k;
        });

    ifft.process(&mut input_complex);

    let len = length as f32; 

    output_slice.par_iter_mut()
        .enumerate()
        .for_each(|(i, output)| {
            let blurred = input_complex[i].re / len;
            let elevation_alpha = get_ul_alpha(input_slice[i], threshold, fade);
            *output = (1.0 - blend_factor * elevation_alpha) * input_slice[i] + blend_factor * elevation_alpha * blurred;
        });
}

#[wasm_bindgen]
pub fn unsharp_mask(input_ptr: *mut f32, blurred_ptr: *mut f32, output_ptr: *mut f32, length: usize, amount: f32, threshold: f32, fade: f32) {
    let input_slice = unsafe { std::slice::from_raw_parts(input_ptr, length) };
    let blurred_slice = unsafe { std::slice::from_raw_parts(blurred_ptr, length) };
    let output_slice = unsafe { std::slice::from_raw_parts_mut(output_ptr, length) };

    output_slice.par_iter_mut()
        .enumerate()
        .for_each(|(i, output)| {
            let original = input_slice[i];
            let blurred = blurred_slice[i];
            let difference = original - blurred;
            let elevation_alpha = get_ll_alpha(input_slice[i], threshold, fade);
            let sharpened = original + amount * difference;
            *output = (1.0 - elevation_alpha) * input_slice[i] + elevation_alpha * sharpened;
        });
}

#[wasm_bindgen]
pub fn noise(input_ptr: *mut f32, output_ptr: *mut f32, length: usize, amount: f32, tri_threshold: f32, pixel_distance: f32, threshold: f32, fade: f32) {
    let size = (length as f32).sqrt() as usize;
    let input_slice = unsafe { std::slice::from_raw_parts(input_ptr, length) };
    let output_slice = unsafe { std::slice::from_raw_parts_mut(output_ptr, length) };
    let rng = Arc::new(Mutex::new(SmallRng::from_entropy()));

    if tri_threshold == 0.0 {
        output_slice.par_iter_mut()
            .enumerate()
            .for_each(|(i, output_value)| {
                let elevation_alpha = get_ll_alpha(input_slice[i], threshold, fade);
                let mut thread_rng = rng.lock().unwrap();
                *output_value = thread_rng.gen_range(0.0, 1.0) * amount * elevation_alpha;
            });
    } else {
        let tri = calculate_tri(&input_slice, size);

        let mut mask: Vec<Complex<f32>> = tri
            .par_iter()
            .map(|&v| if v >= tri_threshold { Complex::new(1.0, 0.0) } else { Complex::new(0.0, 0.0) })
            .collect();

        // blur mask
        let mut planner = FftPlanner::new();
        let fft = planner.plan_fft_forward(length);
        let ifft = planner.plan_fft_inverse(length);

        fft.process(&mut mask);

        // Blur so that the slope of the noise boundary does not exceed 45 degrees.
        let mut kernel = generate_gaussian_kernel(size, (amount / pixel_distance).max(1.0));
        fft_shift_2d(&mut kernel, size);
        fft.process(&mut kernel);

        mask.par_iter_mut()
            .zip(kernel.par_iter())
            .for_each(|(m, &k)| {
                *m *= k;
            });

        ifft.process(&mut mask);

        let len = length as f32;

        output_slice.par_iter_mut()
            .enumerate()
            .for_each(|(i, output_value)| {
                let elevation_alpha = get_ll_alpha(input_slice[i], threshold, fade);
                let mut thread_rng = rng.lock().unwrap();
                *output_value = thread_rng.gen_range(0.0, 1.0) * amount * (mask[i].re / len) * elevation_alpha;
            });
    }
}

fn rotate_rows(data: &mut [Complex<f32>], size: usize, shift: isize) {
    let row_count = data.len() / size;
    let shift = ((shift % row_count as isize) + row_count as isize) as usize % row_count;

    if shift == 0 {
        return;
    }

    data.rotate_left(shift * size);
}

fn fft_shift_2d(data: &mut [Complex<f32>], size: usize) {
    let mid = size / 2;

    for row in data.chunks_mut(size) {
        row.rotate_left(mid);
    }

    rotate_rows(data, size, -(mid as isize));
}

/*
fn ifft_shift_2d(data: &mut [Complex<f32>], size: usize) {
    let mid = size / 2;

    for row in data.chunks_mut(size) {
        for i in 0..mid {
            row.swap(i, i + mid);
        }
    }

    for col in 0..size {
        for i in 0..mid {
            data.swap(i * size + col, (i + mid) * size + col);
        }
    }
}
*/

fn generate_gaussian_kernel(size: usize, radius: f32) -> Vec<Complex<f32>> {
    let sigma = (radius - 1.0) * 0.3 + 0.8;
    let length = size * size;
    let mut kernel = vec![Complex::new(0.0, 0.0); length];
    let center = size / 2;
    let sigma_squared = sigma * sigma;
    let two_pi_sigma_squared = 2.0 * std::f32::consts::PI * sigma_squared;

    for y in 0..size {
        let dy = y - center;
        for x in 0..size {
            let dx = x - center;
            let distance_squared = (dx * dx + dy * dy)  as f32;

            let value = (1.0 / two_pi_sigma_squared) * 
                (-distance_squared / (2.0 * sigma_squared)).exp();

            kernel[y * size + x] = Complex::new(value, 0.0);
        }
    }

    let sum: f32 = kernel.iter().map(|c| c.re).sum();
    let norm = Complex::new(sum, 0.0);

    kernel.par_iter_mut().for_each(|k| {
        *k /= norm;
    });

    kernel
}

// Calculation of Terrain Ruggedness Index considering edge parts
fn calculate_tri(dem: &[f32], size: usize) -> Vec<f32> {
    let mut tri = vec![0.0; dem.len()];

    tri.par_iter_mut().enumerate().for_each(|(i, tri_value)| {
        let row = i / size;
        let col = i % size;
        let mut sum = 0.0;
        let mut count = 0;

        for dy in -1..=1 {
            for dx in -1..=1 {
                if dx == 0 && dy == 0 {
                    continue;
                }

                let neighbor_row = row as i32 + dy;
                let neighbor_col = col as i32 + dx;

                if neighbor_row >= 0 && neighbor_row < size as i32 &&
                   neighbor_col >= 0 && neighbor_col < size as i32 {
                    let neighbor_idx = (neighbor_row * size as i32 + neighbor_col) as usize;
                    let elevation_diff = (dem[i] - dem[neighbor_idx]).abs();
                    sum += elevation_diff;
                    count += 1;
                }
            }
        }

        *tri_value = sum / count as f32;
    });

    tri
}

fn get_ll_alpha(value: f32, threshold: f32, fade: f32) -> f32 {
    let lower = threshold;
    let upper = threshold + fade;

    if value >= upper {
        return 1.0;
    }

    if value <= lower {
        return 0.0;
    }

    (value - lower) / fade
}

fn get_ul_alpha(value: f32, threshold: f32, fade: f32) -> f32 {
    let lower = threshold - fade;
    let upper = threshold;

    if value >= upper {
        return 0.0;
    }

    if value <= lower {
        return 1.0;
    }

    (upper - value) / fade
}
