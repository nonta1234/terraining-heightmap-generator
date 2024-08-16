use serde::{Serialize, Deserialize};
use wasm_bindgen::prelude::*;
use std::io::Cursor;
// use web_sys::console;
extern crate png;
// extern crate console_error_panic_hook;

#[derive(Serialize, Deserialize)]
pub struct ImageData {
    #[serde(with = "serde_bytes")]
    data: Vec<u8>,
}

#[wasm_bindgen]
pub fn encode_png(data: JsValue, width: u32, height: u32, color_type: &str, bit_depth: &str, compression_type: &str) -> Result<JsValue, JsValue> {
    let image_data: ImageData = serde_wasm_bindgen::from_value(data)
        .map_err(|err| JsError::new(&format!("encode_png: Failed to deserialize data: {}", err)))?;

    let color = match color_type {
        "Grayscale" => png::ColorType::Grayscale,
        "Rgb" => png::ColorType::Rgb,
        "Indexed" => png::ColorType::Indexed,
        "GrayscaleAlpha" => png::ColorType::GrayscaleAlpha,
        "Rgba" => png::ColorType::Rgba,
        _ => return Err(JsError::new("encode_png: Invalid color type").into()),
    };

    let depth = match bit_depth {
        "Eight" => png::BitDepth::Eight,
        "Sixteen" => png::BitDepth::Sixteen,
        _ => return Err(JsError::new("encode_png: Invalid bit depth").into()),
    };

    let compression = match compression_type {
        "Default" => png::Compression::Default,
        "Fast" => png::Compression::Fast,
        "Best" => png::Compression::Best,
        _ => return Err(JsError::new("encode_png: Invalid compression type").into()),
    };

    let mut png_data = ImageData { data: Vec::new() };
    {
        let mut encoder = png::Encoder::new(&mut png_data.data, width, height);
        encoder.set_color(color);
        encoder.set_depth(depth);
        encoder.set_compression(compression);

        let mut writer = encoder.write_header()
            .map_err(|err| JsError::new(&format!("encode_png: Failed to write PNG header: {}", err)))?;

        let byte_data: Vec<u8> = if depth == png::BitDepth::Sixteen {
            image_data.data.chunks(2)
                .flat_map(|chunk| {
                    let value: u16 = u16::from_be_bytes(chunk.try_into().unwrap_or([0, 0]));
                    value.to_be_bytes()
                }).collect()
        } else {
            image_data.data.iter().flat_map(|&value| value.to_be_bytes()).collect()
        };

        writer.write_image_data(&byte_data)
            .map_err(|err| JsError::new(&format!("encode_png: Failed to write PNG image data: {}", err)))?;
    }

    Ok(serde_wasm_bindgen::to_value(&png_data)
        .map_err(|err| JsError::new(&format!("encode_png: Failed to serialize png_data: {}", err)))?)
}

#[wasm_bindgen]
pub fn decode_png(data: JsValue) -> Result<JsValue, JsValue> {
    let image_data: ImageData = serde_wasm_bindgen::from_value(data)
        .map_err(|err| JsError::new(&format!("decode_png: Failed to deserialize data: {}", err)))?;
    let cursor = Cursor::new(image_data.data);

    let decoder = png::Decoder::new(cursor);
    let mut reader = decoder.read_info()
        .map_err(|err| JsError::new(&format!("decode_png: Failed to read PNG image data: {}", err)))?;
    let mut buf = vec![0; reader.output_buffer_size()];
    let info = reader.next_frame(&mut buf)
        .map_err(|err| JsError::new(&format!("decode_png: Failed to decode PNG frame: {}", err)))?;
    let bytes = &buf[..info.buffer_size()];
    let decoded_data = ImageData { data: bytes.to_vec() };

    Ok(serde_wasm_bindgen::to_value(&decoded_data)
        .map_err(|err| JsError::new(&format!("decode_png: Failed to serialize decoded data: {}", err)))?)
}
