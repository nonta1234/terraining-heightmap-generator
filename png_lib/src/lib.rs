use serde::{Serialize, Deserialize};
use wasm_bindgen::prelude::*;

extern crate png;

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
