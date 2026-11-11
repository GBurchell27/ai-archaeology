# Şanlıurfa terrain explorer

A local 3D view of the Şanlıurfa window: the Germuş and Tektek plateaus and the Harran plain. The pins are published locations only. Göbekli Tepe and Karahan Tepe are validation sites, not discoveries. 30 m terrain shows landscape, not individual enclosures.

CORONA Atlas imagery is not included. The layer list keeps a labelled placeholder for it.

## Run the viewer

From `Anatolia/explorer`, after the assets below exist:

```bash
npm install
npm run dev
```

The dev server is http://127.0.0.1:43123/

## Rebuild the terrain assets

From the repository root, with the project virtualenv (rasterio, numpy, scipy, pillow):

```bash
.venv/bin/python Anatolia/explorer/scripts/build_web_assets.py
```

That reads Copernicus DEM GLO-30 COGs and one low-cloud Sentinel-2 L2A day from public URLs, reprojects to UTM zone 37N, and writes hillshade, multi-directional hillshade, slope, local relief, and sky-view factor with `ai_archaeology.relief`. Raw GeoTIFFs are not written. The small JPEG and height files under `public/terrain/` are what the viewer loads.

Published points live in `public/sites.geojson`. Adding a site means adding a feature there and running the build again so a 5 km tile is cut. Do not add unpublished or candidate coordinates.
