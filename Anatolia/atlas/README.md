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

## Terrain data

From the repository root, with the project virtualenv:

```bash
.venv/bin/python Anatolia/atlas/scripts/build_atlas_terrain.py
```

That reads Copernicus DEM GLO-90 for about 25.5–45°E, 35.8–42.2°N, downsamples it to roughly 1 km in Web Mercator, and downloads an EOX Sentinel-2 cloudless mosaic. It also copies the existing Şanlıurfa 30 m tiles and cuts a finer GLO-90 window for each Crusader pin. Raw rasters are not written.

Add a later period by giving new features a new `layer` id and a toggle. Each feature needs `startYear` and `endYear` so the period chips can filter it.
