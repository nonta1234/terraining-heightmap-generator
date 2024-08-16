use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Heightmap {
    heightmap: Vec<f32>,
    watermap: Vec<f32>,
    waterwaymap: Vec<f32>,
    result: Vec<f32>,
    pub pointer_to_heightmap: *const f32,
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
            watermap: Vec::new(),
            waterwaymap: Vec::new(),
            result: Vec::new(),
            pointer_to_heightmap: std::ptr::null(),
            pointer_to_watermap: std::ptr::null(),
            pointer_to_waterwaymap: std::ptr::null(),
            pointer_to_result: std::ptr::null(),
        }
    }

    pub fn allocate_map_buffer(&mut self, length: usize) {
        self.heightmap = Vec::with_capacity(length);
        unsafe { self.heightmap.set_len(length) }
        self.pointer_to_heightmap = self.heightmap.as_ptr();

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

    pub fn combine_heightmaps(&mut self, stream_depth: usize) {
        for i in 0..(self.heightmap.len()) {
            let h = if self.heightmap[i] == 0.0 { self.watermap[i] } else { self.heightmap[i] };
            self.result[i] = h - ((1.0 - self.waterwaymap[i]) * (stream_depth as f32));
        }
    }

    pub fn combine_heightmaps_with_littoral(&mut self, water_depth: usize, stream_depth: usize) {
        for i in 0..(self.heightmap.len()) {
            let water_effect = ((1.0 - self.watermap[i]) * (water_depth as f32)).max(
                (1.0 - self.waterwaymap[i]) * (stream_depth as f32)
            );
            self.result[i] = self.heightmap[i] - water_effect;
        }
    }
}
