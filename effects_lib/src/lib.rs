use wasm_bindgen::prelude::*;
use rustfft::{num_complex::Complex, FftPlanner};
use rand::Rng;
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

    let mut input_complex = vec![Complex::new(0.0, 0.0); length];
    for i in 0..length {
        input_complex[i] = Complex::new(input_slice[i], 0.0);
    }
    fft.process(&mut input_complex);

    let mut kernel = generate_gaussian_kernel(size, radius);
    fft.process(&mut kernel);

    for i in 0..length {
        input_complex[i] *= kernel[i];
    }
    ifft.process(&mut input_complex);
    ifft_shift_2d(&mut input_complex, size);

    for i in 0..length {
        let blurred = input_complex[i].re / (length as f32);
        output_slice[i] = (1.0 - blend_factor) * input_slice[i] + blend_factor * blurred;
    }
    // debug_print_data("Output", output_ptr, size, size);
}

#[wasm_bindgen]
pub fn unsharp_mask(input_ptr: *mut f32, blurred_ptr: *mut f32, output_ptr: *mut f32, length: usize, amount: f32) {
    let input_slice = unsafe { std::slice::from_raw_parts(input_ptr, length) };
    let blurred_slice = unsafe { std::slice::from_raw_parts(blurred_ptr, length) };
    let output_slice = unsafe { std::slice::from_raw_parts_mut(output_ptr, length) };

    for i in 0..length {
        let original = input_slice[i];
        let blurred = blurred_slice[i];
        let difference = original - blurred;
        let sharpened = original + amount * difference;
        output_slice[i] = sharpened;
    }
}

#[wasm_bindgen]
pub fn noise(input_ptr: *mut f32, output_ptr: *mut f32, length: usize, amount: f32, range: f32) {
    let size = (length as f32).sqrt() as usize;
    let input_slice = unsafe { std::slice::from_raw_parts(input_ptr, length) };
    let output_slice = unsafe { std::slice::from_raw_parts_mut(output_ptr, length) };

    let mut rng = rand::thread_rng();

    if range == 1.0 {
        for i in 0..length {
            output_slice[i] = input_slice[i] + rng.gen_range(-1.0, 1.0) * amount;
        }
    } else {
        let mut planner = FftPlanner::new();
        let fft = planner.plan_fft_forward(length);
        let ifft = planner.plan_fft_inverse(length);

        let mut input_complex = vec![Complex::new(0.0, 0.0); length];
        for i in 0..length {
            input_complex[i] = Complex::new(input_slice[i], 0.0);
        }
        fft.process(&mut input_complex);
        fft_shift_2d(&mut input_complex, size);

        let kernel = generate_high_pass_kernel(size, range);
        let mut highpass_complex = vec![Complex::new(0.0, 0.0); length];

        for i in 0..length {
            highpass_complex[i] = input_complex[i] * kernel[i];
        }
        ifft_shift_2d(&mut highpass_complex, size);
        ifft.process(&mut highpass_complex);

        let mut highpass_data = vec![0f32; length];

        for i in 0..length {
            let value = highpass_complex[i].re / (length as f32);
            highpass_data[i] = value;
        }

        let alpha = binary_mapping(highpass_data, 0.5);

        for i in 0..length {
            output_slice[i] = input_slice[i] + rng.gen_range(-1.0, 1.0) * amount * alpha[i];
        }
    }
}

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
    for i in 0..length {
        kernel[i] /= Complex::new(sum, 0.0);
    }

    kernel
}

fn generate_high_pass_kernel(size: usize, cutoff: f32) -> Vec<Complex<f32>> {
    let length = size * size;
    let mut kernel = vec![Complex::new(0.0, 0.0); length];
    let center = size / 2;
    let max_freq = (size as f32) / 2.0;
    let octaves = max_freq.log2();
    let freq = 2f32.powf(cutoff * octaves);
    let radius = (freq / max_freq) * (center as f32);

    if radius <= 1.0 {
        kernel[center * size + center] = Complex::new(1.0, 0.0);
        return kernel;
    }

    for y in 0..size {
        let dy = (y as i32 - center as i32) as f32;
        for x in 0..size {
            let dx = (x as i32 - center as i32) as f32;
            let distance = (dx * dx + dy * dy).sqrt();

            let value = if distance <= radius {
                0.0
            } else {
                1.0
            };

            kernel[y * size + x] = Complex::new(value, 0.0);
        }
    }

    let sum: f32 = kernel.iter().map(|c| c.re).sum();
    for i in 0..length {
        kernel[i] /= Complex::new(sum, 0.0);
    }

    kernel
}

fn binary_mapping(data: Vec<f32>, threshold: f32) -> Vec<f32> {
    let min_val = data.iter().cloned().fold(f32::INFINITY, f32::min);
    let max_val = data.iter().cloned().fold(f32::NEG_INFINITY, f32::max);

    if (max_val - min_val).abs() < f32::EPSILON {
        return vec![if data[0] > threshold { 1.0 } else { 0.0 }; data.len()];
    }

    let normalized_data: Vec<f32> = data.iter().map(|&val| {
        (val - min_val) / (max_val - min_val)
    }).collect();

    let binary_data: Vec<f32> = normalized_data.iter().map(|&val| {
        if val > threshold {
            1.0
        } else {
            0.0
        }
    }).collect();

    binary_data
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
