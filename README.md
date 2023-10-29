# Terraining - Heightmap Generator

[![Release](https://img.shields.io/github/v/release/nonta1234/terraining-heightmap-generator)](https://github.com/nonta1234/terraining-heightmap-generator/releases)
[![License](https://img.shields.io/github/license/nonta1234/terraining-heightmap-generator)](./LICENSE)
[![CodeFactor](https://www.codefactor.io/repository/github/nonta1234/terraining-heightmap-generator/badge)](https://www.codefactor.io/repository/github/nonta1234/terraining-heightmap-generator)
[![Made with Nuxt3](https://img.shields.io/badge/Nuxt_3-%2318181B?logo=nuxt.js)](https://nuxt.com)

*This repository is a Nuxt3 reworking of sysoppl/Cities-Skylines-heightmap-generator.*

**An online heightmap generator for "Cities: Skylines".**  
**https://terraining.ateliernonta.com**

## Features

- Select a square area on the map, with sizes ranging from 17.28&ThinSpace;km to 69.12&ThinSpace;km.
- Easily rotate the selected square area.
- Download 16-bit grayscale PNG heightmap and map images.

## How to

1. Choose the area you want to download.
1. Customize the settings within the settings panel to match your preferences.
1. Download either the heightmap or map image.

## Setting panel

- **Lng & Lat**: Adjust your position by modifying the values.
- **Min & Max Height**: Click the refresh button at the bottom to retrieve current area's minimum and maximum elevations. Please note that slight variations in values may occur due to interpolation based on map size.
- **Map Size**: Set the size within the range of 17.28&ThinSpace;km to 62.12&ThinSpace;km square.
- **Sea Level**: Elevations below this level are automatically adjusted to 0m.
- **Adjust Level**: The sea level is automatically aligned with the minimum height.
- **Height Ratio**: Define the vertical-to-horizontal distance ratio.
- **Height Scale**: Set the proportion relative to actual terrain height.  
*‡Height Ratio and Height Scale are interrelated and are linked to map size. You can lock one.*
- **Elev. Type**: Auto-configures Height Ratio and Height Scale.
  * Manual: No automatic adjustments.
  * Limit: If exceeded, adjusts the maximum elevation to 1,023.98&ThinSpace;m.
  * Maxi.: Set the maximum elevation at 1,023.98&ThinSpace;m.
- **Water Depth**: Modify the water depth.
- **Littoral Length**: Adjust the littoral zone distance. Increasing it creates a gradual slope from the coast to the seabed.
- **Littoral Editor**: Configure the shape of the littoral slope.
- **Smoothing & Sharpen**: Set ranges for terrain smoothing and sharpening.

## Control panel

- Download the following data:
  * Heightmap in 16-bit grayscale PNG format
  * Map image
  * OSM data
- Configuration Panel
- Visualize smooth and sharpen areas on the map. Keep in mind that, due to Mapbox specifications, the representation is approximate.
- Navigate to the grid position.

## Configuration Panel

- **Heightmap Type**: Selection of CS2 will soon be available.
- **Interpolation**: Choose from Bilinear or Bicubic.
- **Stream Depth**: Aiding in the depiction of streams.
- **Smooth Count**: Determine the number of times the smooth effect is repeated.
- **Noise Value**: Add or subtract height.
- **Noise Grid**: Adjust the level of detail for noise. The smaller the number, the finer the details.

## Plans

- I plan to achieve compatibility with Cities: Skylines II.
