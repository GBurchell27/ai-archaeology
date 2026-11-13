# Anatolia atlas

A full-screen terrain atlas from the Turkey overview through the Şanlıurfa region to published places such as Göbekli Tepe. Use the Şanlıurfa button or zoom into the southeast. The atlas loads the regional terrain as you approach.

Pins are published places only. Neolithic points are the original six. Crusader-era points are historic cities, castles, one battle area, and one river event, each with a source and a confidence value. Open rings are approximate. Nothing here is a discovery, and  the national grid cannot show buildings.

## Run

From the repository root, `python run.py` prepares the regional layer from the local Explorer assets and opens the atlas. With the project Python dependencies installed, run `python Anatolia/atlas/scripts/build_sanliurfa_region.py` to prepare that layer independently. This step reprojects the existing files and uses no network.

```bash
cd Anatolia/atlas
npm install
npm run dev
```

http://127.0.0.1:43127/

`npm run build` checks the production build.

## Explore and compare

- Zoom toward a published place and choose **Enter place**, or open it from search. **Story** has an occupation timeline and catalogue overview. Places with a research guide add excavation evidence, interpretation and links to related places.
- **Maps** controls the terrain and context layers and lists historical maps and external viewers. CORONA can be selected in place where a frame is already available. The regional map library is also in **Settings**.
- **Sources** links to field projects, papers, museums and the underlying catalogue. The [educational bibliography](../educational-sources.md) has further reading and source-specific questions.
- **Landscape** compares present-day elevations by catalogue, area and date range. **Model benchmark** lets you vary the match distance and landscape group in the saved held-out evaluation. The [research notes](../maps-and-landscape-research.md) document the survey coverage needed to move from recovery rates to a model of site likelihood.

- **Trip** replays a personal journey over the map. Drag the bar, or press Play, to move a plane, car or walker along the route and trace where you have been. Nights pass quickly and travel plays slowly. The ‹ › buttons and Page Up and Page Down jump between stops. **Follow** keeps the camera on the traveller, and dragging the map turns it off. The April 2026 trip is in `lib/trip/turkeyTrip2026.ts`. Hotels are placed at town level, and times not taken from a ticket are marked as estimated. Flights from off the map start and end at its edge. Drives and walks follow roads from OpenStreetMap, routed once by OSRM and saved in `public/trips/turkey-2026-04.roads.json`. The roads are the router's fastest route, not a GPS trace. After changing a stop, rebuild the file with `../explorer/node_modules/.bin/esbuild scripts/fetch_trip_roads.mts --bundle --platform=node --format=esm --outfile=.next/fetch_trip_roads.mjs` and `node .next/fetch_trip_roads.mjs`. A walk the router can only reach by a long detour, such as the paths inside Göbeklitepe and up Nemrut, stays a straight line. The plane and car are CC0 models from tevy.dev, fetched with `node scripts/fetch_trip_models.mjs`, which also copies the KTX2 texture transcoder into `public/basis/`. Run `../explorer/node_modules/.bin/esbuild scripts/check_trip.mts --bundle --platform=node --format=esm --outfile=.next/check_trip.mjs` and then `node .next/check_trip.mjs` to check that the timeline is unbroken.

`tests/test_panel_flight.py` and `tests/test_timeline_keys.py` drive the page with puppeteer-core. They skip when `node_modules/puppeteer-core` is missing. Install dependencies here and leave the dev server running before those tests.

## Terrain data

From the repository root, with the project virtualenv:

```bash
.venv/bin/python Anatolia/atlas/scripts/build_atlas_terrain.py
```

That reads Copernicus DEM GLO-90 for about 25.5–45°E, 35.8–42.2°N, downsamples it to roughly 1 km in Web Mercator, and downloads an EOX Sentinel-2 cloudless mosaic. It also copies the existing Şanlıurfa 30 m tiles and cuts a ~10 km GLO-30 window for each Crusader pin. Void sentinels are masked and edge spikes are filled before the height map is written. Raw rasters are not written. Close-up views use about 1.5–2× vertical exaggeration; the national view uses more so the ranges still read.

Add a later period by giving new features a new `layer` id and a toggle. Each feature needs `startYear` and `endYear` so the period chips can filter it.

The **Sources** tab loads a resources shard from `public/resources/`. Rebuild it from the Pleiades dump and Wikidata with:

```bash
.venv/bin/python Anatolia/atlas/scripts/build_place_resources.py
```

The catalogue geojson is left as it is. The script needs the Pleiades dump at `/tmp/pleiades-places-latest.json.gz` (or `PLEIADES_DUMP`).
