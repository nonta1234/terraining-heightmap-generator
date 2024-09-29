use wasm_bindgen::prelude::*;
use std::sync::{Arc, Mutex};
use rustfft::{num_complex::Complex, FftPlanner};
use rand::{rngs::SmallRng, Rng, SeedableRng};
use rayon::prelude::*;
// use web_sys::console;

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
pub fn gaussian_blur(input_ptr: *mut f32, output_ptr: *mut f32, length: usize, radius: f32, blend_factor: f32) {
    // console_error_panic_hook::set_once();
    // debug_log(&format!("Starting gaussian_blur: length={}, radius={}, blend_factor={}", length, radius, blend_factor));
    let size = (length as f32).sqrt() as usize;

    let input_slice = unsafe { std::slice::from_raw_parts(input_ptr, length) };
    let output_slice = unsafe { std::slice::from_raw_parts_mut(output_ptr, length) };

    // debug_print_data("Input", input_ptr, size, size);

    let mut planner = FftPlanner::new();
    let fft = planner.plan_fft_forward(length);
    let ifft = planner.plan_fft_inverse(length);

    let mut input_complex: Vec<Complex<f32>> = (0..length)
        .into_par_iter()
        .map(|i| Complex::new(input_slice[i], 0.0))
        .collect();
    fft.process(&mut input_complex);

    let mut kernel = generate_gaussian_kernel(size, radius);
    fft.process(&mut kernel);

    input_complex.par_iter_mut()
        .zip(kernel.par_iter())
        .for_each(|(i, &k)| {
            *i *= k;
        });

    ifft.process(&mut input_complex);
    ifft_shift_2d(&mut input_complex, size);

    let len = length as f32; 

    output_slice.par_iter_mut()
        .enumerate()
        .for_each(|(i, output)| {
            let blurred = input_complex[i].re / len;
            *output = (1.0 - blend_factor) * input_slice[i] + blend_factor * blurred;
        });
    // debug_print_data("Output", output_ptr, size, size);
}

#[wasm_bindgen]
pub fn unsharp_mask(input_ptr: *mut f32, blurred_ptr: *mut f32, output_ptr: *mut f32, length: usize, amount: f32) {
    let input_slice = unsafe { std::slice::from_raw_parts(input_ptr, length) };
    let blurred_slice = unsafe { std::slice::from_raw_parts(blurred_ptr, length) };
    let output_slice = unsafe { std::slice::from_raw_parts_mut(output_ptr, length) };

    output_slice.par_iter_mut()
        .enumerate()
        .for_each(|(i, output)| {
            let original = input_slice[i];
            let blurred = blurred_slice[i];
            let difference = original - blurred;
            let sharpened = original + amount * difference;
            *output = sharpened;
        });
}

#[wasm_bindgen]
pub fn noise(input_ptr: *mut f32, output_ptr: *mut f32, length: usize, amount: f32, range: f32, pixel_distance: f32) {
    let size = (length as f32).sqrt() as usize;
    let input_slice = unsafe { std::slice::from_raw_parts(input_ptr, length) };
    let output_slice = unsafe { std::slice::from_raw_parts_mut(output_ptr, length) };
    // let mut rng = rand::thread_rng();
    let rng = Arc::new(Mutex::new(SmallRng::from_entropy()));

    if range == 1.0 {
        output_slice.par_iter_mut()
            .for_each(|output_value| {
                let mut thread_rng = rng.lock().unwrap();
                *output_value = thread_rng.gen_range(0.0, 1.0) * amount;
            });
    } else if range == 0.0 {
        output_slice.par_iter_mut()
            .for_each(|output_value| {
                *output_value = 0.0;
            });
    } else {
        let tri = calculate_tri(&input_slice, size);
        let tri_calc = calculate_tri_limited_range(&input_slice, size, 100);

        let mut sorted_tri = tri_calc.clone();
        sorted_tri.par_sort_by(|a, b| a.partial_cmp(b).unwrap());
        let index = ((1.0 - range) * (sorted_tri.len() as f32)).round() as usize;
        let index_value = sorted_tri[index];

        let mut mask: Vec<Complex<f32>> = tri
            .par_iter()
            .map(|&v| if v >= index_value { Complex::new(1.0, 0.0) } else { Complex::new(0.0, 0.0) })
            .collect();

        // blur mask
        let mut planner = FftPlanner::new();
        let fft = planner.plan_fft_forward(length);
        let ifft = planner.plan_fft_inverse(length);

        fft.process(&mut mask);

        // Blur so that the slope of the noise boundary does not exceed 45 degrees.
        let mut kernel = generate_gaussian_kernel(size, (amount / pixel_distance).max(1.0));
        fft.process(&mut kernel);

        mask.par_iter_mut()
            .zip(kernel.par_iter())
            .for_each(|(m, &k)| {
                *m *= k;
            });

        ifft.process(&mut mask);
        ifft_shift_2d(&mut mask, size);

        let len = length as f32;

        output_slice.par_iter_mut()
            .zip(mask.par_iter())
            .for_each(|(output_value, &mask)| {
                let mut thread_rng = rng.lock().unwrap();
                *output_value = thread_rng.gen_range(0.0, 1.0) * amount * (mask.re / len);
            });
    }
}

/*
fn fft_shift_2d(data: &mut [Complex<f32>], size: usize) {
    let mid = size / 2;
    let cor = size % 2;

    for row in data.chunks_mut(size) {
        row.rotate_left(mid + cor);
    }

    for col in 0..size {
        let mut column: Vec<Complex<f32>> = (0..size).map(|row| data[row * size + col]).collect();
        column.rotate_left(mid + cor);

        for (row, &value) in column.iter().enumerate() {
            data[row * size + col] = value;
        }
    }
}
*/

fn ifft_shift_2d(data: &mut [Complex<f32>], size: usize) {
    let mid = size / 2;

    for row in data.chunks_mut(size) {
        row.rotate_right(mid);
    }

    for col in 0..size {
        let mut column: Vec<Complex<f32>> = (0..size).map(|row| data[row * size + col]).collect();
        column.rotate_right(mid);

        for (row, &value) in column.iter().enumerate() {
            data[row * size + col] = value;
        }
    }
}

fn generate_gaussian_kernel(size: usize, radius: f32) -> Vec<Complex<f32>> {
    let sigma = (radius - 1.0) * 0.3 + 0.8;
    let length = size * size;
    let mut kernel = vec![Complex::new(0.0, 0.0); length];
    let center = size / 2;

    for y in 0..size {
        let dy = y as i32 - center as i32;
        for x in 0..size {
            let dx = x as i32 - center as i32;
            let distance_squared = (dx * dx + dy * dy) as f32;
            kernel[y * size + x] = Complex::new((-distance_squared / (2.0 * sigma * sigma)).exp(), 0.0);
        }
    }

    let sum: f32 = kernel.iter().map(|c| c.re).sum();

    kernel.par_iter_mut().for_each(|k| {
        *k /= Complex::new(sum, 0.0);
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

fn calculate_tri_limited_range(dem: &[f32], size: usize, padding: usize) -> Vec<f32> {
    let limited_size = size - 2 * padding;
    let mut tri = vec![0.0; limited_size * limited_size];

    tri.par_iter_mut().enumerate().for_each(|(i, tri_value)| {
        let limited_row = i / limited_size;
        let limited_col = i % limited_size;
        let row = limited_row + padding;
        let col = limited_col + padding;
        let center_idx = row * size + col;
        let mut sum = 0.0;

        for dy in -1..=1 {
            for dx in -1..=1 {
                if dx == 0 && dy == 0 {
                    continue;
                }

                let neighbor_row = row as i32 + dy;
                let neighbor_col = col as i32 + dx;
                let neighbor_idx = (neighbor_row * size as i32 + neighbor_col) as usize;
                let elevation_diff = (dem[center_idx] - dem[neighbor_idx]).abs();
                sum += elevation_diff;
            }
        }

        *tri_value = sum / 8.0; // 8は常に有効な近傍セルの数
    });

    tri
}

/*
fn debug_print_complex(label: &str, data: &[Complex<f32>]) {
    let mut debug_message = format!("{}:\n", label);
    for (_, &value) in data.iter().enumerate().take(5) {
        debug_message.push_str(&format!("{:.2e}+{:.2e}i ", value.re, value.im));
    }
    debug_message.push_str("...\n");
    let sum = data.iter().fold(Complex::new(0.0, 0.0), |acc, &x| acc + x);
    let max = data.iter().fold(0.0f32, |acc, &x| acc.max(x.norm()));
    debug_message.push_str(&format!("Sum: {:.2e}+{:.2e}i\n", sum.re, sum.im));
    debug_message.push_str(&format!("Max magnitude: {:.2e}\n", max));
    debug_log(&debug_message);
}

fn debug_print_kernel(label: &str, kernel: &[f32]) {
    let mut debug_message = format!("{}:\n", label);
    for (i, &value) in kernel.iter().enumerate().take(10) {
        debug_message.push_str(&format!("{:.4e} ", value));
        if (i + 1) % 5 == 0 {
            debug_message.push('\n');
        }
    }
    debug_message.push_str("...\n");
    debug_message.push_str(&format!("Kernel length: {}\n", kernel.len()));
    debug_message.push_str(&format!("Sum: {:.4e}\n", kernel.iter().sum::<f32>()));
    debug_log(&debug_message);
}

fn debug_print_data(label: &str, ptr: *const f32, width: usize, height: usize) {
    let mut debug_message = format!("{}:\n", label);
    unsafe {
        let slice = std::slice::from_raw_parts(ptr, width * height);
        let mut non_zero_count = 0;
        let mut sum = 0.0;
        for y in 0..height {
            for x in 0..width {
                let value = slice[y * width + x];
                if value != 0.0 {
                    non_zero_count += 1;
                }
                sum += value;
                if x < 5 && y < 5 {
                    debug_message.push_str(&format!("{:.2e} ", value));
                }
            }
            if y < 5 {
                debug_message.push('\n');
            }
        }
        debug_message.push_str("...\n");
        debug_message.push_str(&format!("Non-zero values: {}\n", non_zero_count));
        debug_message.push_str(&format!("Sum: {:.2e}\n", sum));
        debug_message.push_str(&format!("Average: {:.2e}\n", sum / (width * height) as f32));
    }
    debug_log(&debug_message);
}

fn debug_log(message: &str) {
    console::log_1(&JsValue::from_str(message));
}
*/
