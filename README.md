# AI archaeology

A personal hobby project: a world atlas of published early monuments and archaeological sites, drawn on a 3D globe, with terrain you can drop into and a coarse, heavily caveated model layer on top.

It grew out of a pipeline for learning how ancient structures can show up in public terrain and satellite data, and how to check those hints against published records before a person takes them seriously. That part is still here.

This is a learning and research project. It is not a product, not a survey, and not a way to declare new sites.

## Honest scope

What exists now:

- **A globe of published sites.** 118,486 published site records from Wikidata and Pleiades, 426 hand-picked early monuments with a line on why each matters, and 15,845 megaliths from OpenStreetMap as a separate layer. Search, a timeline, a type filter, and a card for each site.
- **Drill-down terrain.** Any published site between 80°S and 80°N opens as a 10 km terrain block at about 15 m, built on demand from open elevation data. It shows landscape. It does not show buildings.
- **Anatolia in depth.** Turkey has its own terrain atlas, from the national overview through the Şanlıurfa region to the published Taş Tepeler sites, including Göbekli Tepe and Karahan Tepe. This is the **known-site validation region**: the place to see whether a method notices monuments that archaeologists already published, and how often it is wrong. It is not a blank-map search. The notes are in [`Anatolia/`](Anatolia/README.md).
- **A model layer of published-record patterns.** Ten world rasters at 0.25° (about 28 km) that show where published sites of a kind tend to be recorded. Only 3 of the 10 beat a baseline that knows nothing but survey effort. 84% of land is marked "no basis". Nothing transfers between continents. See [`docs/suitability-model.md`](docs/suitability-model.md).
- **Relief visualisation from a DEM**, and a small cross-region training check on published monuments.

What does not exist: detection of new sites, a literature check with an audit trail, ranked candidates, and a private review map. Those are the rest of the pipeline below and are not built.

No dataset is in use until its licence is written down in [`docs/data-sources.md`](docs/data-sources.md).

Nothing in this repository is a discovery.

## Pipeline

```
terrain / imagery
    -> relief visualisations
    -> detection
    -> literature check, with an audit trail
    -> ranked candidates
    -> human review
```

1. **Terrain and imagery.** Public DEMs, LiDAR, and satellite scenes, each used under its own licence.
2. **Relief visualisations.** Hillshade, multi-directional hillshade, slope, local relief, and sky-view factor, so a person can see low mounds and ditches that a plain elevation raster hides.
3. **Detection.** A later step. It would propose candidates. It would not confirm them.
4. **Literature check, with an audit trail.** Compare a candidate with published surveys and site records. Keep the citation, the dataset version, and the date, so a later reader can see why it was kept or dropped. The world catalogue is the start of the published side of that comparison.
5. **Ranked candidates.** Order the leftovers by how strongly the terrain hint and the literature check agree. Rank is a sorting aid.
6. **Human review.** A private map for a person to accept, reject, or send to an archaeologist. A candidate stays a candidate until an archaeologist confirms it.

## Ethics

These are hard rules:

- **Never commit precise coordinates of candidate or undiscovered sites.** Looting is the reason. This includes commits, issues, figures, filenames, and documentation.
- **Shareable outputs use coarse or jittered locations.** A public note can name a province or a published site. It does not pin an unconfirmed place.
- **A candidate is never called a discovery** unless an archaeologist confirms it. The code and the write-ups use "candidate".
- **Respect each dataset's licence.** Record dataset, resolution, coverage, licence, access, and notes in `docs/data-sources.md` before use. Do not redistribute a file the licence does not allow.
- **Do not overclaim what the sensors see.** Optical imagery, radar, and DEMs cannot see through rock or deep sediment. A mound in a hillshade is a surface shape. It is not a buried building, and it is not a date.

The atlas carries a world catalogue of published site records. This is what is allowed, and what is not:

- **Allowed: published records from registered open sources.** A site may be in the catalogue when an open-licence source already publishes it and that source's licence is recorded in `docs/data-sources.md`. Today that means Wikidata and Pleiades. Each record carries its source, licence, and attribution.
- **Allowed, kept apart: share-alike sources.** OpenStreetMap is ODbL. Its records stay in their own file and their own layer and are never merged or de-duplicated into the rest.
- **Allowed with a citation: a corrected coordinate.** Where a source's point for a featured monument is plainly wrong, a fix may be committed only with the published source that gives the location.
- **Never: candidate, unpublished, or undiscovered locations.** Not from a detector, not from a personal reading of imagery, not from a tip. Not in any file.
- **Model outputs only as coarse cells.** The model layer is published as 0.25° cells. No points, no per-cell tables, no list of top cells.
- **Fuzzed coordinates never place a pin.** The radiocarbon compilations blur their locations on purpose. They are used to date pins that already exist and for nothing else.

A source that hides or restricts its coordinates, as EAMENA and the Australian state registers do, is not a source for this atlas.

## Layout

```
src/ai_archaeology/              Python package
    relief.py                    relief visualisations from a DEM
    world/                       world catalogue: ingesters, merge, dating, web packing
    suitability/                 the coarse recording-pattern model
    sites/, eval/                Anatolia site catalogue and its evaluation
    ingest/, regions/, train/,
    transfer/, pipeline/         cross-region training check
scripts/                         download and build scripts (the scripts, not the data)
Anatolia/atlas/                  the web app: globe, Anatolia terrain atlas, place view
Anatolia/atlas/public/world/     the static world catalogue the globe reads
Anatolia/atlas/public/predict/   the model layers and their metrics
Anatolia/atlas/public/paleo/     the ice and sea level layer: one coarse raster per 500 years
Anatolia/                        SE Anatolia notes, registers, and the earlier terrain explorer
docs/                            data-source register and the documents below
tests/                           pytest, synthetic inputs
data/                            gitignored local downloads and source records
outputs/                         gitignored local products
```

Documents:

- [`docs/world-atlas.md`](docs/world-atlas.md): how the web app is put together.
- [`docs/world-catalogue.md`](docs/world-catalogue.md): sources, merge rules, the featured tier, file formats, known problems.
- [`docs/suitability-model.md`](docs/suitability-model.md): the model layer, its metrics and its limits.
- [`docs/inspiration.md`](docs/inspiration.md): the open projects and papers this learned from.
- [`docs/data-sources.md`](docs/data-sources.md): the licence register.
- [`docs/cross-region-pipeline.md`](docs/cross-region-pipeline.md): the cross-region training check.
- [SAR Doppler feasibility protocol](docs/sar/protocol.md) and the metadata-only Sentinel-1 search.

## Requirements

- Python 3.11+
- GDAL, which rasterio needs. Wheels from PyPI bundle a matching GDAL, so `pip install` is enough on a machine that can use those wheels. Building rasterio from source needs the GDAL development libraries installed first.
- Node.js for the web app. The checks use `node --experimental-strip-types`, which needs Node 22.6 or later.

Torch is an optional extra for a later detection step. Nothing imports it yet.

## Setup

Linux and macOS:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
pytest
```

Windows (PowerShell):

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e .
pytest
```

Without activating, call the interpreter directly: `.venv/bin/python` on Linux and macOS, `.venv/Scripts/python` on Windows. The commands below write `python` for whichever of those you use.

Optional, unused here: `pip install -e ".[torch]"`.

## Run the atlas

```bash
cd Anatolia/atlas
npm install
npm run dev
```

Then open http://127.0.0.1:43127/. From the repository root, `python run.py` does the same and opens the browser.

What works with Node alone, because it is committed as static files:

- the globe, the site catalogue, search, timeline, filters, the featured monuments and the site cards
- the OpenStreetMap megalith layer and the model layers
- the Anatolia terrain atlas with its baked national and place terrain
- the walk view of Göbekli Tepe and Karahan Tepe: the modelled reconstructions, and the photograph splats in `Anatolia/atlas/public/splats/` (CC BY-SA 4.0, credits beside them)

What needs more:

- **The place view needs the Python virtualenv and a network connection.** The server starts the repository's own Python (`.venv/bin/python`, or `.venv\Scripts\python.exe` on Windows) to build each terrain block from open elevation tiles. Set `ATLAS_PYTHON` to use a different interpreter. The first build of a place takes roughly 10 to 15 seconds. The result is cached outside git.
- **The globe imagery is streamed** from EOX Sentinel-2 cloudless, with NASA Blue Marble as the fallback. Offline, the globe is a dark sphere with sites on it.
- The Şanlıurfa regional layer of the Anatolia atlas is built locally. See [`Anatolia/atlas/README.md`](Anatolia/atlas/README.md).

`npm run build` checks the production build.

## Rebuild the data

The catalogue and model files under `Anatolia/atlas/public/` are committed. You only need this section to refresh them.

**These scripts download real data.** Run them only when the owner of the repository has asked for that download. Each one keeps its raw responses under `data/` (gitignored), so a rerun fetches only what is missing. Run them from the repository root.

The site records, in any order:

```bash
python scripts/fetch_world_wikidata.py --featured src/ai_archaeology/world/featured_monuments.json
python scripts/fetch_world_pleiades.py
python scripts/fetch_world_osm_megaliths.py
python scripts/fetch_world_radiocarbon.py
python scripts/fetch_featured_coordinates.py
```

| Script | Downloads | Cache under `data/world/` | Size and time in the November 2026 run |
| --- | --- | --- | --- |
| `fetch_world_wikidata.py` | Published archaeological sites from the Wikidata query service, in many small queries | `raw/wikidata/` | 234 MB, about 30 minutes, 414 requests |
| `fetch_world_pleiades.py` | The Pleiades gazetteer dump, one file | `raw/pleiades-places-latest.json.gz` | 130 MB |
| `fetch_world_osm_megaliths.py` | OpenStreetMap megaliths from Overpass | `raw/osm/` | 5 MB |
| `fetch_world_radiocarbon.py` | p3k14c and the four XRONOS tables, as CSV | `raw/radiocarbon/` | 72 MB |
| `fetch_featured_coordinates.py` | Wikidata coordinates of the 426 featured monuments | `raw/featured/` | 6 MB |

Only the Wikidata harvest was timed. The source records land in `data/world/sources/` and `data/world/dating/`.

Then build the web catalogue. This step uses no network and replaces `Anatolia/atlas/public/world/` as a whole:

```bash
python scripts/build_world_catalogue.py
```

Then the model layer. The first command downloads about 670 MB (ETOPO 2022 and HydroSHEDS) into `data/world/covariates/raw/` and reads six climate slices over HTTP. The second uses no network, takes about two and a half minutes, and rewrites `Anatolia/atlas/public/predict/`:

```bash
python scripts/fetch_global_covariates.py
python -m ai_archaeology.suitability
```

Then the globe's ice and sea level layer. The first command reads coarse overviews of 90 CHELSA-TraCE21k files over HTTP (38 MB kept under `data/world/paleo/`, about a minute and a half). The second uses no network and rewrites `Anatolia/atlas/public/paleo/`:

```bash
python scripts/fetch_paleo_context.py
python scripts/build_paleo_context.py
```

One line per script is in [`scripts/README.md`](scripts/README.md).

## Relief visualisations

Elevations and pixel size must share a unit, normally metres. Reproject a geographic (degree) DEM to a metre CRS first. The CLI warns if the CRS is geographic, and it still writes the files.

`python -m ai_archaeology.relief` reads band 1 of a GeoTIFF and writes, into `--out-dir`:

| File | What it is |
| --- | --- |
| `hillshade.tif` | Lambert cosine shade, 0 (shadow) to 1 (full light). Light azimuth defaults to 315°, altitude to 45°. Central differences, so it is close to `gdaldem hillshade` and not pixel-identical. |
| `multidirectional_hillshade.tif` | Mean of hillshades at equally spaced azimuths (default 8). |
| `slope.tif` | Slope magnitude in degrees. |
| `local_relief.tif` | DEM minus a circular mean of `--relief-radius`. Positive is locally high. This is the simple residual, not Hesse's full local-relief model. |
| `sky_view_factor.tif` | Fraction of the sky visible, 0 to 1, from a horizon search of `--svf-radius` over `--svf-directions` bearings. `1 - mean(sin horizon angle)`, after Zakšek, Oštir, and Kokalj (2011), with no vertical exaggeration. |

Each GeoTIFF keeps the source CRS and transform, which is what QGIS and other GIS software use to place a raster. A PNG next to it is only a preview and is not georeferenced.

```bash
python -m ai_archaeology.relief path/to/dem.tif --out-dir outputs/relief
```

Useful knobs: `--azimuth`, `--altitude`, `--multi-directions`, `--relief-radius`, `--svf-radius`, `--svf-directions`.

From Python:

```python
from ai_archaeology.relief import hillshade, local_relief, sky_view_factor
```

## Tests

`pytest` runs everything under `tests/`. The inputs are synthetic.

- **Relief.** Synthetic DEMs built in memory: a flat plane, ramps with a known slope, and a circular mound inside a ring ditch. The grids use an arbitrary origin. They are not placed on a real site.
- **World catalogue.** `tests/test_world_*.py` cover the ingesters, the merge and de-duplication rules, radiocarbon dating, the featured list, and the packed web files.
- **Model.** `tests/test_suitability.py` plants a rule in synthetic covariates and checks that it is recovered on held-out blocks, that the export has no coordinates, and that the envelope masks out-of-range cells.
- **Guards.** `tests/test_no_candidate_coordinates.py` checks that tracked files hold no candidate coordinate pairs and that git tracks no rasters.
- **Web app logic.** Several test files start `node` on a check script under `Anatolia/atlas/scripts/`, for the globe maths, the view URL, the catalogue keys and filters, search, and the place view geometry. They need Node on the path, and `npm install` in `Anatolia/atlas` for the ones that import three.js.
- **Browser checks.** `tests/test_detail_coverage.py`, `tests/test_panel_flight.py` and `tests/test_timeline_keys.py` drive the page with puppeteer-core. They need the dev server at `http://127.0.0.1:43127/`, and they launch Chrome from its Linux path. On Windows, leave them out. [`docs/world-atlas.md`](docs/world-atlas.md) says how.

## Cross-region training

A separate slice standardises public terrain from Ireland, the United States, and Turkey, then trains only on the first two and checks recall on published atlas sites. The notes, the metadata schema, and the frozen-split rule are in [`docs/cross-region-pipeline.md`](docs/cross-region-pipeline.md). Licences are in [`docs/data-sources.md`](docs/data-sources.md). Rasters stay out of git.

```bash
python scripts/run_cross_region_smoke.py
```

## What this does not do

- **It does not find sites.** Every point on the globe was published by someone else first. Nothing here detects, predicts, or confirms a site, and nothing ranks candidates or draws a review map.
- **The model layer is a map of published-record patterns.** It shows where catalogues are dense as much as where people built. A blank or low cell often means little survey, not absence. It is far too coarse to point at a place.
- **Coverage is heavily European, because the open data is.** Of the 99,885 Wikidata records, about 89,500 fall in a rough box around Europe. The rest: about 4,500 in Asia, 2,800 in Africa and the nearer Near East, 2,200 in North America, 700 in South America, and 70 in Oceania. Pleiades adds the ancient Mediterranean and Near East and nothing beyond. The OpenStreetMap megaliths are 98% European. Whole traditions of monument building are nearly absent from the globe. That is a gap in open inventories, not in the past.
- **Most sites have no date.** About 26% of the catalogue carries a date range (30,737 of 118,486 in the 21 November 2026 build). The timeline hides or shows the rest as one undated group, and a new visit leaves them hidden until Include undated is on. Play history reveals dated sites as its playhead reaches them.
- **Many records are thin.** About one in six has no usable type and is filed as "other". Many are register stubs: a name, a point, and a link.
- **It does not see underground.** A smooth field can hide archaeology, and a bump can be a spoil heap, a road, or noise.
