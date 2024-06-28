# Terraining - Heightmap Generator

[![Release](https://img.shields.io/github/v/release/nonta1234/terraining-heightmap-generator)](https://github.com/nonta1234/terraining-heightmap-generator/releases)
[![License](https://img.shields.io/github/license/nonta1234/terraining-heightmap-generator)](./LICENSE)
[![CodeFactor](https://www.codefactor.io/repository/github/nonta1234/terraining-heightmap-generator/badge)](https://www.codefactor.io/repository/github/nonta1234/terraining-heightmap-generator)
[![Made with Nuxt3](https://img.shields.io/badge/Nuxt_3-%2318181B?logo=nuxt.js)](https://nuxt.com)

*This repository is a Nuxt3 reworking of sysoppl/Cities-Skylines-heightmap-generator.*

**An online heightmap generator for "Cities: Skylines".**  
**https://terraining.ateliernonta.com**

<br>

> [!IMPORTANT]
> Currently, my site has thousands of users each month. Considering the number of API requests needed to generate heightmaps for CS2, I am significantly exceeding the free tier limits of Mapbox. Therefore, I kindly ask for your continued cooperation in avoiding costs by inputting your Mapbox token.

<br>

---

## Features

- Easily get the heightmap for CS1 and CS2.
- Choose a square area on the map between 8.64&#8202;km and 69.12&#8202;km for CS1 and between 28.672&#8202;km and 229.376&#8202;km for CS2.
- Easily rotate the selected square area.
- Download the heightmap, map images, and OSM data. For CS2, you can get both the heightmap and the world map.

## How to

1. Choose the area you want to download.
1. Customize the settings within the settings panel to match your preferences.
1. Download either the heightmap or map image, etc.

## Setting panel

- **Lng & Lat**&#8202;: Adjust your geographic coordinates by modifying these values.
- **Min & Max Height**&#8202;: Click the refresh button at the bottom to retrieve current area's minimum and maximum elevations. Please note that slight variations in values may occur due to interpolation based on map size.
- **Zoom Level**&#8202;: Set the zoom level of the map.
- **Grid Angle**&#8202;: Set the angle of the grid. The angle increases clockwise.
- **Map Size**&#8202;: Set the map size. You can change the map size between 1/2 and 4x the default size (CS1&#8202;: 17.28&#8202;km, CS2&#8202;: 57.344&#8202;km) . The size includes the unplayable area.
- **Sea Level**&#8202;: Elevations below this level are automatically adjusted to 0&#8202;m.
- **Adjust Level**&#8202;: The sea level is automatically aligned with the minimum height.
- **Height Ratio**&#8202;: Define the vertical-to-horizontal distance ratio.
- **Height Scale**&#8202;: Set the proportion relative to actual terrain height.  
*‡ Height Ratio and Height Scale are interrelated and are linked to map size. You can lock one.*
- **Elev. Type**&#8202;: Auto-configures Height Ratio and Height Scale.
  * Manual&#8202;: No automatic adjustments.
  * Limit&#8202;: If exceeded, adjusts the maximum elevation to 1,023.98&#8202;m (CS1) or elevation scale value (CS2). 
  * Maximise&#8202;: Set the maximum elevation at 1,023.98&#8202;m (CS1) or elevation scale value (CS2).
- **Water Depth**&#8202;: Modify the water depth.
- **Littoral Zone**&#8202;: Adjust the width of littoral zone. Increasing it creates a gradual slope from the coast to the seafloor.
- **Littoral Editor**&#8202;: Configure the shape of the littoral slope.
- **Smoothing & Sharpen**&#8202;: Set ranges for terrain smoothing and sharpening.

    The refresh button retrieves the minimum and maximum elevation in the grid. Additionally, grid information is displayed in the browser console.

## Download panel

- Download the following data&#8202;:
  * Heightmap in raw data
  * Heightmap in 16-bit grayscale PNG format
  * Map image
  * OSM data
- Configuration Panel
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
*‡ Depending on the configuration, many API requests may occur, so you'll need a Mapbox access token.*

## Configuration panel

- **Heightmap Type**&#8202;: Choose either CS1 or CS2.
- **Interpolation**&#8202;: Choose from Bilinear or Bicubic.
- **Elevation Scale**&#8202;: The maximum elevation for CS2.
- **Waterside Detail**&#8202;: Adjust the level of detail for waterside drawings.
- **Stream Depth**&#8202;: Aiding in the depiction of streams.
- **Smooth Count**&#8202;: Determine the number of times the smooth effect is repeated.
- **Noise Value**&#8202;: Add or subtract height.
- **Noise Detail**&#8202;: Adjust the level of detail for noise. The higher the value, the finer the noise.
- **Reflecting the amount of effect**&#8202;: Reflect the sharpen and smooth intensity on the map.
- **User Style URL**&#8202;: Downloads a map image using the specified map style.
- **Access Token**&#8202;: You will need your own Mapbox access token to download the heightmap for CS2.

## ToDo

- [x] Improve the littoral slope shape.
- [x] Make the entire download process a web worker.
- [x] Download map information.
- [x] Download more customized map images.
- [ ] Improve shapeen and smooth behavior in CS2 map.
- [ ] River bed level correction.
- [ ] Support for Larger map mod.
