use serde::{Serialize, Deserialize};
use wasm_bindgen::prelude::*;

extern crate png;

#[derive(Serialize, Deserialize)]
pub struct ImageBuffer {
  width: u32,
  height: u32,
  #[serde(with = "serde_bytes")]
  data: Vec<u8>,
}

#[derive(Serialize, Deserialize)]
pub struct PngImage {
  #[serde(with = "serde_bytes")]
  data: Vec<u8>,
}

#[wasm_bindgen]
pub fn encode_16g(buffer: JsValue) -> Result<JsValue, JsValue> {
  let _buffer: ImageBuffer = serde_wasm_bindgen::from_value(buffer)?;
  let mut png_data = PngImage { data: Vec::new() };
  {
    let mut encoder = png::Encoder::new(&mut png_data.data, _buffer.width, _buffer.height);
    encoder.set_color(png::ColorType::Grayscale);
    encoder.set_depth(png::BitDepth::Sixteen);
    let mut writer = encoder.write_header().expect("Failed to write PNG header");

    let byte_data: Vec<u8> = _buffer.data.iter().flat_map(|&value| value.to_be_bytes()).collect();

    writer
      .write_image_data(&byte_data)
      .expect("Failed to write PNG image data");
  };
  Ok(serde_wasm_bindgen::to_value(&png_data)?)
}
