*This repository is a Nuxt3 reworking of sysoppl/Cities-Skylines-heightmap-generator.*
# Terraining - Heightmap Generator

**An online heightmap generator for "Cities: Skylines".**  
**https://terraining.ateliernonta.com**

## Features

- Select a square area from the map, ranging in size from 17.28 to 69.12 km.
- Freely rotate the square area.
- Download 16bit grayscale PNG heightmap and map images.

## How to

1. Choose the area you want to download.
1. Customize the settings in the settings panel according to your preferences.
1. Download the heightmap or map image.

## Setting panel

- **Lng & Lat**: Adjust your position by changing the values.
- **Min & Max Height**: Use the refresh button at the bottom to retrieve current area's minimum and maximum elevations. Note that slight variations in values may occur due to interpolation based on map size.
- **Map Size**: Set size between 17.28 and 62.12 km square.
- **Sea Level**: Elevations below this height are adjusted to 0 m.
- **Adjust Level**: Sea level automatically matches minimum height.
- **Height Ratio**: Define vertical-to-horizontal distance ratio.
- **Height Scale**: Set proportion relative to actual height.  
*‡Height Ratio and Height Scale are Interrelated and linked to map size. You can lock one.*
- **Elev. Type**: Auto-configures Height Ratio and Height Scale.
  * Manual: No automatic adjustments.
  * Limit: Adjusts maximum elevation to 1,023.98 m if exceeded.
  * Maxi.: Sets maximum elevation at 1,023.98 m.
- **Water Depth**: Adjusts water depth.
- **Littoral Length**: Changes littoral zone distance. Increasing creates a gentle slope from coast to seabed.
- **Littoral Editor**: Configure littoral slope shape.
- **Smoothing & Sharpen**: Set smoothing and sharpening ranges for terrain.

## Control panel

- Download the following data:
  * Heightmap in 16bit grayscale PNG format
  * Map image
  * OSM data
- Visualize smooth and sharpen areas on the map. Keep in mind that, due to Mapbox specifications, the representation is approximate.
- Navigate to the grid position.

## Current known issues

- The effect is nearly imperceptible.

## Plans

- Achieve compatibility with Cities: Skylines II.
