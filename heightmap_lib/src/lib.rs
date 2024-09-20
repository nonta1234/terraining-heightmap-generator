use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Heightmap {
    heightmap: Vec<f32>,
    blurredmap: Vec<f32>,
    sharpenmap: Vec<f32>,
    watermap: Vec<f32>,
    waterwaymap: Vec<f32>,
    result: Vec<f32>,
    pub pointer_to_heightmap: *const f32,
    pub pointer_to_blurredmap: *const f32,
    pub pointer_to_sharpenmap: *const f32,
    pub pointer_to_watermap: *const f32,
    pub pointer_to_waterwaymap: *const f32,
    pub pointer_to_result: *const f32,
}

#[wasm_bindgen]
impl Heightmap {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            heightmap: Vec::new(),
            blurredmap: Vec::new(),
            sharpenmap: Vec::new(),
            watermap: Vec::new(),
            waterwaymap: Vec::new(),
            result: Vec::new(),
            pointer_to_heightmap: std::ptr::null(),
            pointer_to_blurredmap: std::ptr::null(),
            pointer_to_sharpenmap: std::ptr::null(),
            pointer_to_watermap: std::ptr::null(),
            pointer_to_waterwaymap: std::ptr::null(),
            pointer_to_result: std::ptr::null(),
        }
    }

    pub fn allocate_map_buffer(&mut self, length: usize) {
        self.heightmap = Vec::with_capacity(length);
        unsafe { self.heightmap.set_len(length) }
        self.pointer_to_heightmap = self.heightmap.as_ptr();

        self.blurredmap = Vec::with_capacity(length);
        unsafe { self.blurredmap.set_len(length) }
        self.pointer_to_blurredmap = self.blurredmap.as_ptr();

        self.sharpenmap = Vec::with_capacity(length);
        unsafe { self.sharpenmap.set_len(length) }
        self.pointer_to_sharpenmap = self.sharpenmap.as_ptr();

        self.watermap = Vec::with_capacity(length);
        unsafe { self.watermap.set_len(length) }
        self.pointer_to_watermap = self.watermap.as_ptr();

        self.waterwaymap = Vec::with_capacity(length);
        unsafe { self.waterwaymap.set_len(length) }
        self.pointer_to_waterwaymap = self.waterwaymap.as_ptr();

        self.result = Vec::with_capacity(length);
        unsafe { self.result.set_len(length) }
        self.pointer_to_result = self.result.as_ptr();
    }

    pub fn combine_heightmaps(&mut self, water_depth: f32, stream_depth: f32, smooth_thres: f32, smooth_fade: f32, sharpen_thres: f32, sharpen_fade: f32) {
        let preprocessed_blurredmap = mix_array_with_ul(&self.heightmap, &self.blurredmap, smooth_thres, smooth_fade);
        let preprocessed_sharpenmap = mix_array_with_ll(&self.heightmap, &self.sharpenmap, sharpen_thres, sharpen_fade);

        for i in 0..(self.heightmap.len()) {
            let value = &self.heightmap[i];
            let smooth_alpha = get_ul_alpha(value, &smooth_thres, &smooth_fade);
            let sharpen_alpha = get_ll_alpha(value, &sharpen_thres, &sharpen_fade);
            let denom = smooth_alpha + sharpen_alpha;
            let sm_mix_alpha = smooth_alpha / denom;
            let sh_mix_alpha = sharpen_alpha / denom;

            let height = if denom == 0.0 { value } else { &(sm_mix_alpha * preprocessed_blurredmap[i] + sh_mix_alpha * preprocessed_sharpenmap[i]) };

            let water_effect = ((1.0 - self.watermap[i]) * water_depth).max(
                (1.0 - self.waterwaymap[i]) * stream_depth
            );

            self.result[i] = height - water_effect;
        }
    }
}

fn get_ll_alpha(value: &f32, threshold: &f32, fade: &f32) -> f32 {
    let min = threshold;
    let max = threshold + fade;

    let alpha = if value > &max {
        1.0
    } else if value > min {
        (value - min) / fade
    } else {
        0.0
    };
    alpha
}

fn get_ul_alpha(value: &f32, threshold: &f32, fade: &f32) -> f32 {
    let min = threshold - fade;
    let max = threshold;

    let alpha = if value < &min {
        1.0
    } else if value < max {
        (max - value) / fade
    } else {
        0.0
    };
    alpha
}

fn mix_array_with_ll(original: &Vec<f32>, modified: &Vec<f32>, threshold: f32, fade: f32) -> Vec<f32> {
    let length = original.len();
    assert_eq!(length, modified.len(), "Input vectors must have the same length");
    let mut result = Vec::with_capacity(length);

    for i in 0..length {
        let value = original[i];
        let alpha = get_ll_alpha(&value, &threshold, &fade);
        result.push(original[i] * (1.0 - alpha) + modified[i] * alpha);
    }
    result
}

fn mix_array_with_ul(original: &Vec<f32>, modified: &Vec<f32>, threshold: f32, fade: f32) -> Vec<f32> {
    let length = original.len();
    assert_eq!(length, modified.len(), "Input vectors must have the same length");
    let mut result = Vec::with_capacity(length);

    for i in 0..length {
        let value = original[i];
        let alpha = get_ul_alpha(&value, &threshold, &fade);
        result.push(original[i] * (1.0 - alpha) + modified[i] * alpha);
    }
    result
}
