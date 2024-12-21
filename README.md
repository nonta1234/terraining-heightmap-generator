# Terraining - Heightmap Generator

[![Release](https://img.shields.io/github/v/release/nonta1234/terraining-heightmap-generator)](https://github.com/nonta1234/terraining-heightmap-generator/releases)
[![License](https://img.shields.io/github/license/nonta1234/terraining-heightmap-generator)](./LICENSE)
[![CodeFactor](https://www.codefactor.io/repository/github/nonta1234/terraining-heightmap-generator/badge)](https://www.codefactor.io/repository/github/nonta1234/terraining-heightmap-generator)
[![Made with Nuxt3](https://img.shields.io/badge/Nuxt_3-%2318181B?logo=nuxt.js)](https://nuxt.com)

*This repository is based on and further developed from sysoppl/Cities-Skylines-heightmap-generator.*

**An online heightmap generator for Cities: Skylines, Unity, and Unreal Engine.**  
**https://terraining.ateliernonta.com**

<br>

> [!WARNING]
> #### MapTiler API Key Requirement
> - Since Ver.2, a MapTiler API key is mandatory.
> - Optional Mapbox elevation data still requires a MapTiler API key.
>
> #### Migration to Ver.2
> - First, please reset all settings using the reset button on the config tab. Keys and Tokens are not reset.

<br>

---

## Features

- Offers a preview feature
- Easily generate heightmaps for Cities: Skylines 1 & 2, Unity, and Unreal Engine
- Select square areas ranging from&#8202;:
  * Cities: Skylines 1&#8202;: 8.64&#8202;km to 69.12&#8202;km
  * Cities: Skylines 2&#8202;: 28.672&#8202;km to 229.376&#8202;km
  * Unity and Unreal Engine&#8202;: 0.5&#8202;km to 100&#8202;km
- Rotate selected area with ease
- Download multiple formats&#8202;:
  * Heightmap
  * Map images
  * OSM data
  * For Cities: Skylines 2, get both heightmap and world map

## How to

1. Choose the area you want to download.
1. Customize the settings within the settings panel to match your preferences.
1. Download either the heightmap or map image, etc.

## Setting panel

- **Lng & Lat**&#8202;: Adjust your geographic coordinates by modifying these values.
- **Zoom Level**&#8202;: Set the zoom level of the map.
- **Grid Angle**&#8202;: Set the angle of the grid. The angle increases clockwise.

### Preview

- **Normalize**&#8202;: Normalize preview image.
- **Min & Max Height**&#8202;: Click the preview button at the bottom to retrieve current area's minimum and maximum elevations. Please note that slight variations in values may occur due to interpolation based on map size. If the elevation does not fit within the "Elev. Scale" due to settings other than the "Elev. Type", the color of the numerical value will change.
- **Scale**&#8202;: For Unreal Engine.

### General Tab

- **Map Type**&#8202;: Select the map type from CS1, CS2, Unity, or UE.
- **Map Size**&#8202;: Set the map size. You can change the map size. For CS1 and CS2, the size includes the unplayable area.
- **Resolution**&#8202;: Heightmap resolution.
- **Elev. Scale**&#8202;: The maximum height that the heightmap can depict, measured relative to the base level. For example, if the base level is -100&#8202;m and the Elevation Scale is 2,000&#8202;m, the maximum elevation that can be represented is 1,900&#8202;m.
- **World Partition & Cells**&#8202;: For UE5 - World Partition.
- **Base Level**&#8202;: The minimum elevation that the heightmap can represent. Setting it to the seabed elevation or the lowest elevation allows you to make the most of the resolution of the Elevation Scale.
- **Adjust Level**&#8202;: The base level is automatically aligned with the minimum height.
- **Height Ratio**&#8202;: Define the vertical-to-horizontal distance ratio.
- **Height Scale**&#8202;: Set the proportion relative to actual terrain height.  
*† Height Ratio and Height Scale are interrelated and are linked to map size. You can lock one.*
- **Elev. Type**&#8202;: Auto-configures Height Ratio and Height Scale.
  * Manual&#8202;: No automatic adjustments.
  * Limit&#8202;: If exceeded, adjusts the maximum elevation to elevation scale value. 
  * Maximise&#8202;: Set the maximum elevation at elevation scale value.
- **Interpolation**&#8202;: Choose from Bilinear or Bicubic.

    The preview button retrieves the minimum and maximum elevation in the grid. Additionally, grid information is displayed in the browser console.

### Water Tab

- **Littoral Editor**&#8202;: Configure the shape of the littoral slope.
- **Detail**&#8202;: Level of detail of the water area.
- **Water Depth**&#8202;: Modify the water depth.
- **Littoral Zone**&#8202;: Adjust the width of littoral zone. Increasing it creates a gradual slope from the coast to the seafloor.
- **Riparian Zone**&#8202;: Adjust the width of riparian zone. Increasing it creates a gradual slope from the riverbank or lakeshore to the bottom of the river or lake.
- **Stream Depth & Stream Width**&#8202;: Aiding in the depiction of streams.
- **Use actual seafloor**&#8202;: Get the seafloor elevation using MapTiler Ocean RGB.

### Modify Tab

- **Smoothing**&#8202;: Gaussian blur.
- **Sharpen**&#8202;: Unsharp mask.
- **Reflecting the amount of effect**&#8202;: Reflect the sharpen and smooth intensity on the map.

    Smoothing is applied below the threshold value, Sharpen is applied above the threshold value.

    Noise is applied within the same altitude range as the shapen, with the Terrain Ruggedness Index (TRI) used as the threshold.

### Config Tab

- **Preview at original resolution**&#8202;: Please note that there will be many API requests.
- **MapTiler API Key**&#8202;: Required from version 2.
- **Use mapbox for heightmap source**&#8202;: You can choose the source of elevation data.
- **Mapbox Access Token**&#8202;: Required to get custom map images.
- **Mapbox User Style URL**&#8202;: For map image.

    You can import and export settings other than MapTiler API Key, Mapbox Access Token, and Mapbox User Style URL.

## Download panel

- Download the following data&#8202;:
  * Heightmap in raw data
  * Heightmap in 16-bit grayscale PNG format
  * Map image
  * OSM data
- GitHub link

## Control buttons

- Home
- Zoom in
- Zoom out
- Compass
- Grid&#8202;:
  * Left click&#8202;: Reset the grid direction to north.
  * Right click&#8202;: Rotate the map so that the grid is facing up.
- Displays the shape and smooth effect area on the map.

## Customize map image panel

- Download map images by customizing style, zoom level, and image size.  
*† Depending on the configuration, many API requests may occur, so you'll need a Mapbox access token.*

## ToDo

- [x] Improve the littoral slope shape.
- [x] Make the entire download process a web worker.
- [x] Download map information.
- [x] Download more customized map images.
- [x] Improve shapeen and smooth behavior in CS2 map.
- [x] Improve ocean-river connections.
- [ ] River bed level correction.
- [ ] Support for Larger map mod.
- [ ] Uses WebGL to improve effects processing.
