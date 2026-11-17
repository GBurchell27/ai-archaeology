# World atlas (web app)

A full-screen atlas of published early monuments and archaeological sites. It opens on a 3D globe and has three views:

- **Globe.** Every published site in the world catalogue, on streamed satellite imagery.
- **Place.** A 10 km terrain block at about 15 m for any published site between 80°S and 80°N.
- **Anatolia terrain atlas.** The original atlas: from the Turkey overview through the Şanlıurfa region to published places such as Göbekli Tepe.

Every point is a published place. Nothing here is a discovery, and none of the terrain can show buildings.

How the app is put together, the URL scheme, the close-up API and the checks are in [`docs/world-atlas.md`](../../docs/world-atlas.md). The data behind the globe is in [`docs/world-catalogue.md`](../../docs/world-catalogue.md). The folder is still called `Anatolia/atlas` because that is where the app began.

## Run

```bash
cd Anatolia/atlas
npm install
npm run dev
```

http://127.0.0.1:43127/

From the repository root, `python run.py` does the same, prepares the Şanlıurfa regional layer from the local Explorer assets, and opens the browser. With the project Python dependencies installed, run `python Anatolia/atlas/scripts/build_sanliurfa_region.py` to prepare that layer independently. This step reprojects the existing files and uses no network.

The globe and the Anatolia atlas run on Node alone. The place view also needs the repository's Python virtualenv, because the server runs `scripts/closeup_window.py` with `.venv/bin/python` (`.venv\Scripts\python.exe` on Windows) to build each terrain block. Set `ATLAS_PYTHON` to point at another interpreter.

`npm run build` checks the production build.

## The globe

- **Sites.** About 40,000 of the best-known sites load at once. The rest load by 10° cell as you zoom below 2,500 km. The colour of a point is its type. Click a point for its card.
- **Wonders.** 396 hand-picked monuments, with a line on why each matters. Browse them, take the tour, or jump to a random one. Contested and pseudo-archaeological entries are marked as such.
- **Search** covers every name in the catalogue.
- **Timeline.** Drag the range to filter by calendar year. Most sites have no date. A switch shows or hides them.
- **Layers.** Labels, wonders only, the OpenStreetMap megaliths (a separate layer under ODbL), and the recording-pattern layer. That last one shows where published sites of a kind tend to be recorded, at about 28 km cells. It is not a map of undiscovered sites. Its caveats are shown with it. See [`docs/suitability-model.md`](../../docs/suitability-model.md).
- **About** lists the sources and their licences.
- **Site card.** Type, dates where the catalogue has them, the source record and its licence, **Fly closer**, **Copy link**, and **View terrain**. For a site inside the bounds of the Anatolia atlas (25.5–45°E, 35.8–42.2°N) the card offers **Open in Anatolia atlas** instead.

Zoom in over Turkey and the globe offers **Enter Anatolia terrain** below 900 km. Keep zooming and it enters by itself below 450 km. In the atlas, the **Globe** button or zooming well out goes back.

The imagery is EOX Sentinel-2 cloudless 2020 (CC BY-NC-SA 4.0), streamed. If that host does not answer, the globe falls back to NASA Blue Marble.

## The place view

Open it with **View terrain** on a site card. The first build of a place takes roughly 10 to 15 seconds, then it is cached outside git.

- **Surface:** satellite, hillshade, or satellite with a low sun.
- **Relief height** exaggerates the vertical. **Sun from** turns the light, which is how low earthworks and terraces show.
- A north arrow, a scale bar, and the credits for relief, imagery and the site record.
- Escape or the back button returns to where you were.

The relief is the GEM-15 surface model at 15 m, with Copernicus GLO-30 filling gaps and standing in where GEM-15 has no tile. GEM-15 does not cover Russia, China, Mongolia or Greenland. A place whose window would cross the 180° meridian is refused.

## The Anatolia terrain atlas

Pins are published places only. Neolithic points are the original six. Crusader-era points are historic cities, castles, one battle area, and one river event, each with a source and a confidence value. Open rings are approximate. Use the Şanlıurfa button or zoom into the southeast. The atlas loads the regional terrain as you approach.

- Zoom toward a published place and choose **Enter place**, or open it from search. **Story** has an occupation timeline and catalogue overview. Places with a research guide add excavation evidence, interpretation and links to related places.
- **Maps** controls the terrain and context layers and lists historical maps and external viewers. CORONA can be selected in place where a frame is already available. The regional map library is also in **Settings**.
- **Sources** links to field projects, papers, museums and the underlying catalogue. The [educational bibliography](../educational-sources.md) has further reading and source-specific questions.
- **Landscape** compares present-day elevations by catalogue, area and date range. **Model benchmark** lets you vary the match distance and landscape group in the saved held-out evaluation. The [research notes](../maps-and-landscape-research.md) document the survey coverage needed to move from recovery rates to a model of site likelihood.

### Trip

**Trip** replays a personal journey over the map. Drag the bar, or press Play, to move a plane, car or walker along the route and trace where you have been. Nights pass quickly and travel plays slowly. The ‹ › buttons and Page Up and Page Down jump between stops. **Follow** keeps the camera on the traveller, and dragging the map turns it off.

The April 2026 trip is in `lib/trip/turkeyTrip2026.ts`. Hotels are placed at town level, and times not taken from a ticket are marked as estimated. Flights from off the map start and end at its edge. Drives and walks follow roads from OpenStreetMap, routed once by OSRM and saved in `public/trips/turkey-2026-04.roads.json`. The roads are the router's fastest route, not a GPS trace. A walk the router can only reach by a long detour, such as the paths inside Göbeklitepe and up Nemrut, stays a straight line.

After changing a stop, rebuild the roads file with `../explorer/node_modules/.bin/esbuild scripts/fetch_trip_roads.mts --bundle --platform=node --format=esm --outfile=.next/fetch_trip_roads.mjs` and `node .next/fetch_trip_roads.mjs`. The plane and car are CC0 models from tevy.dev, fetched with `node scripts/fetch_trip_models.mjs`, which also copies the KTX2 texture transcoder into `public/basis/`. Run `../explorer/node_modules/.bin/esbuild scripts/check_trip.mts --bundle --platform=node --format=esm --outfile=.next/check_trip.mjs` and then `node .next/check_trip.mjs` to check that the timeline is unbroken.

## Checks

The logic checks are plain Node scripts. From this folder:

```bash
node --experimental-strip-types scripts/check_globe_math.mts
```

Each prints `{"ok":true}` and has a pytest wrapper under `tests/` at the repository root. The list, and how to run a browser check on Windows, is in [`docs/world-atlas.md`](../../docs/world-atlas.md).

`tests/test_panel_flight.py` and `tests/test_timeline_keys.py` drive the page with puppeteer-core. They skip when `node_modules/puppeteer-core` is missing. Install dependencies here and leave the dev server running before those tests. They launch Chrome from its Linux path.

## World data

`public/world/` and `public/predict/` are built from the repository root:

```bash
python scripts/build_world_catalogue.py
python -m ai_archaeology.suitability
```

Both read local files under `data/` and use no network. The downloads that feed them are listed in the [root README](../../README.md#rebuild-the-data).

## Terrain data

From the repository root, with the project virtualenv (`.venv/bin/python`, or `.venv/Scripts/python` on Windows):

```bash
python Anatolia/atlas/scripts/build_atlas_terrain.py
```

That reads Copernicus DEM GLO-90 for about 25.5–45°E, 35.8–42.2°N, downsamples it to roughly 1 km in Web Mercator, and downloads an EOX Sentinel-2 cloudless mosaic. Place relief is separate. Rebuild it from GEM-15 with:

```bash
python Anatolia/atlas/scripts/rebuild_place_relief.py
```

That reads the public GEM-15 surface-model COGs (15 m, CC BY 4.0, attribution “This dataset is produced by Google”) and fills masked cells from Copernicus GLO-30. Hillshade and the other relief JPEGs are 15 m. The height mesh is 15 m when the window stays within 480 cells on a side, and 30 m otherwise. The previous Copernicus tiles are kept under each place’s `copernicus/` directory and can be selected in the atlas. Raw GeoTIFFs are not written. The national overview stays on GLO-90. Close-up views of places without a baked tile use the same GEM-15 fill, at 15 m, and are cached outside git. The place view of the world globe uses that same on-demand build. Vertical exaggeration is about 1.5–2× up close and higher on the national view so the ranges still read.

GEM-15 is an experimental preprint (Batchu et al. 2026, https://doi.org/10.31223/X55N75), not lidar. The atlas uses the surface model. The bare-earth DTM is a neural network and lowers some occupied mounds, so it is not the draped layer.

Add a later period by giving new features a new `layer` id and a toggle. Each feature needs `startYear` and `endYear` so the period chips can filter it.

The **Sources** tab loads a resources shard from `public/resources/`. Rebuild it from the Pleiades dump and Wikidata with:

```bash
python Anatolia/atlas/scripts/build_place_resources.py
```

The catalogue geojson is left as it is. The script needs the Pleiades dump at `/tmp/pleiades-places-latest.json.gz` (or `PLEIADES_DUMP`).
