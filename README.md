# Terraining - Heightmap Generator

[![Release](https://img.shields.io/github/v/release/nonta1234/terraining-heightmap-generator)](https://github.com/nonta1234/terraining-heightmap-generator/releases)
[![License](https://img.shields.io/github/license/nonta1234/terraining-heightmap-generator)](./LICENSE)
[![CodeFactor](https://www.codefactor.io/repository/github/nonta1234/terraining-heightmap-generator/badge)](https://www.codefactor.io/repository/github/nonta1234/terraining-heightmap-generator)
[![Made with Nuxt3](https://img.shields.io/badge/Nuxt_3-%2318181B?logo=nuxt.js)](https://nuxt.com)

*This repository is a Nuxt3 reworking of sysoppl/Cities-Skylines-heightmap-generator.*

**An online heightmap generator for "Cities: Skylines".**  
**https://terraining.ateliernonta.com**

## Features

- Easily get the heightmap for CS1 and CS2.
- Choose a square area on the map between 17.28&ThinSpace;km and 69.12&ThinSpace;km for CS1 and between 57.344&ThinSpace;km and 229.376&ThinSpace;km for CS2.
- Easily rotate the selected square area.
- Download the heightmap, map images, and OSM data. For CS2, you can get both the heightmap and the world map.

## How to

1. Choose the area you want to download.
1. Customize the settings within the settings panel to match your preferences.
1. Download either the heightmap or map image, etc.

## Setting panel

- **Lng & Lat**&ThinSpace;: Adjust your geographic coordinates by modifying these values.
- **Min & Max Height**&ThinSpace;: Click the refresh button at the bottom to retrieve current area's minimum and maximum elevations. Please note that slight variations in values may occur due to interpolation based on map size.
- **Map Size**&ThinSpace;: Set the map size.
- **Sea Level**&ThinSpace;: Elevations below this level are automatically adjusted to 0&ThinSpace;m.
- **Adjust Level**&ThinSpace;: The sea level is automatically aligned with the minimum height.
- **Height Ratio**&ThinSpace;: Define the vertical-to-horizontal distance ratio.
- **Height Scale**&ThinSpace;: Set the proportion relative to actual terrain height.  
*‡Height Ratio and Height Scale are interrelated and are linked to map size. You can lock one.*
- **Elev. Type**&ThinSpace;: Auto-configures Height Ratio and Height Scale.
  * Manual&ThinSpace;: No automatic adjustments.
  * Limit&ThinSpace;: If exceeded, adjusts the maximum elevation to 1,023.98&ThinSpace;m (CS1) or elevation scale value (CS2). 
  * Maxi.&ThinSpace;: Set the maximum elevation at 1,023.98&ThinSpace;m (CS1) or elevation scale value (CS2).
- **Water Depth**&ThinSpace;: Modify the water depth.
- **Littoral Length**&ThinSpace;: Adjust the littoral zone distance. Increasing it creates a gradual slope from the coast to the seabed.
- **Littoral Editor**&ThinSpace;: Configure the shape of the littoral slope.
- **Smoothing & Sharpen**&ThinSpace;: Set ranges for terrain smoothing and sharpening.

## Download panel

- Download the following data&ThinSpace;:
  * Heightmap in raw data
  * Heightmap in 16-bit grayscale PNG format
  * Map image
  * OSM data
- Configuration Panel
- GitHub link

## Control Buttons

- Home
- Zoom in
- Zoom out
- Compass
- Grid&ThinSpace;:
  * Left click&ThinSpace;: Reset the grid direction to north.
  * Right click&ThinSpace;: Rotate the map so that the grid is facing up.
- Displays the shape and smooth effect area on the map.

## Configuration Panel

- **Heightmap Type**&ThinSpace;: Choose either CS1 or CS2.
- **Interpolation**&ThinSpace;: Choose from Bilinear or Bicubic.
- **Elevation Scale**&ThinSpace;: The maximum elevation for CS2.
- **Stream Depth**&ThinSpace;: Aiding in the depiction of streams.
- **Smooth Count**&ThinSpace;: Determine the number of times the smooth effect is repeated.
- **Noise Value**&ThinSpace;: Add or subtract height.
- **Noise Detail**&ThinSpace;: Adjust the level of detail for noise. The higher the value, the finer the noise.
- **Reflecting the amount of effect**&ThinSpace;: Reflect the sharpen and smooth intensity on the map.
- **Access Token**&ThinSpace;: You will need your own Mapbox access token to download the heightmap for CS2.

## ToDo

- Improve the littoral slope shape.
- Make the entire download process a web worker.
