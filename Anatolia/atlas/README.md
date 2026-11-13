# Anatolia atlas

A full-screen terrain atlas of Turkey, from the national view down to a published place. The Vite explorer in `Anatolia/explorer` is still there.

Pins are published places only. Neolithic points are the original six. Crusader-era points are historic cities, castles, one battle area, and one river event, each with a source and a confidence value. Open rings are approximate. Nothing here is a discovery, and  the national grid cannot show buildings.

## Run

```bash
cd Anatolia/atlas
npm install
npm run dev
```

http://127.0.0.1:43127/

`npm run build` checks the production build.

`tests/test_panel_flight.py` and `tests/test_timeline_keys.py` drive the page with puppeteer-core. They skip when `node_modules/puppeteer-core` is missing. Install dependencies here and leave the dev server running before those tests.

## Terrain data

From the repository root, with the project virtualenv:

```bash
.venv/bin/python Anatolia/atlas/scripts/build_atlas_terrain.py
```

That reads Copernicus DEM GLO-90 for about 25.5–45°E, 35.8–42.2°N, downsamples it to roughly 1 km in Web Mercator, and downloads an EOX Sentinel-2 cloudless mosaic. Place relief is separate. Rebuild it from GEM-15 with:

```bash
.venv/bin/python Anatolia/atlas/scripts/rebuild_place_relief.py
```

That reads the public GEM-15 surface-model COGs (15 m, CC BY 4.0, attribution “This dataset is produced by Google”) and fills masked cells from Copernicus GLO-30. Hillshade and the other relief JPEGs are 15 m. The height mesh is 15 m when the window stays within 480 cells on a side, and 30 m otherwise. The previous Copernicus tiles are kept under each place’s `copernicus/` directory and can be selected in the atlas. Raw GeoTIFFs are not written. The national overview stays on GLO-90. Close-up views of places without a baked tile use the same GEM-15 fill, at 15 m, and are cached outside git. Vertical exaggeration is about 1.5–2× up close and higher on the national view so the ranges still read.

GEM-15 is an experimental preprint (Batchu et al. 2026, https://doi.org/10.31223/X55N75), not lidar. The atlas uses the surface model. The bare-earth DTM is a neural network and lowers some occupied mounds, so it is not the draped layer.

Add a later period by giving new features a new `layer` id and a toggle. Each feature needs `startYear` and `endYear` so the period chips can filter it.

Place panels load a resources shard from `public/resources/` when they open. Rebuild it from the Pleiades dump and Wikidata with:

```bash
.venv/bin/python Anatolia/atlas/scripts/build_place_resources.py
```

The catalogue geojson is left as it is. The script needs the Pleiades dump at `/tmp/pleiades-places-latest.json.gz` (or `PLEIADES_DUMP`).
