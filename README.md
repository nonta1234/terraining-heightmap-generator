*This repository is a reworking of sysoppl/Cities-Skylines-heightmap-generator in Nuxt3.*
# Terraining - Heightmap Generator

**Online heightmap generator for "Cities: Skylines".**  
**https://terraining.ateliernonta.com**

## Features

- Take a square area from the map, ranging in size from 17.28 to 69.12 km.
- Download 16bit grayscale PNG and map images.

## How to

1. Select area that you want to download.
1. Customize the settings in the setting panel to your preference.
1. Download the height map or map image.

## Setting panel

- **Lng & Lat**: You can move by changing the values.
- **Min & Max Height**: The refresh button at the bottom of the panel allows you to retrieve the minimum and maximum elevations for the current area. However, interpolation is applied based on the map size, causing slight variations in the values.
- **Map Size**: You can set a size ranging from 17.28 meters to 62.12 km square.
- **Sea Level**: All elevations below the set height will be adjusted to 0 m.
- **Adjust Level**: Sea level will automatically adjust to match the minimum height.
- **Height Ratio**: Set the ratio of vertical distance to horizntal distance.
- **Height Scale**: Set the proportion relative to the actual height.  
*‡Height Ratio and Height Scale are interrelated and also connected to the map size. You can lock either one of them.*
- **Elev. Type**: This parameter is for automatically configuring Height Ratio and Height Scale.
  * Manual: This will not perform automatic adjustments.
  * Limit: If the maximum elevation exceeds 1,023.98 m, it will be adjusted to fit within that range.
  * Maxi.: The maximum elevation will be automatically adjusted to always remain at 1,023.98 m.
- **Water Depth**: Adjusts the water depth.
- **Littoral Length**: Adjusts the distance of the littoral zone. Increasing it will create a gentle slope from the coastline to the seabed.
- **Littoral Editor**: Configure the shape of the littoral slope.
- **Smoothing & Sharpen**: Set the range for making it smooth and the range for making it sharpen.

## Control panel

- Download the following data.
  * Heightmap with 16bit grayscale PNG
  * Map image
  * OSM data
- Visualize the smooth area and sharpen area on the map. Please note that due to Mapbox specifications, the representation is approximate.
- Move to the position of the grid.

## Current known issues

- The sharpen effect is almost non-existent.

## Plans

- Compatibility with Cities: Skylines II.
