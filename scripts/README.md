# Scripts

Download and build scripts belong here. Commit the script, not the file it downloads.

Run them from the repository root with the project virtualenv: `.venv/bin/python` on Linux and macOS, `.venv/Scripts/python` on Windows. Some defaults are paths relative to the current directory.

**The fetch scripts download real data.** Do not run one unless the owner of the repository asked for that download. Each one caches its raw responses under `data/` (gitignored), so a rerun does not refetch. Delete the cache folder to take a fresh snapshot.

## Every script

| Script | What it does | Reads from the network | Writes |
| --- | --- | --- | --- |
| `fetch_world_wikidata.py` | Harvests published archaeological sites from Wikidata (CC0). Megalithic and monumental class trees are taken whole. Other site classes are kept only when the item has a Wikipedia article. Pass `--featured src/ai_archaeology/world/featured_monuments.json` so the featured monuments are always included. | `query.wikidata.org/sparql`, one request at a time | `data/world/sources/wikidata.jsonl`, raw responses in `data/world/raw/wikidata/` |
| `fetch_world_pleiades.py` | Downloads the Pleiades gazetteer dump (CC BY 3.0) and keeps places with an archaeological kind. | one `json.gz` dump | `data/world/sources/pleiades.jsonl`, dump in `data/world/raw/` |
| `fetch_world_osm_megaliths.py` | Fetches OpenStreetMap megaliths from Overpass (ODbL). They stay a separate layer. | one Overpass query, or six longitude bands if that times out | `data/world/sources/osm.jsonl`, raw responses in `data/world/raw/osm/` |
| `fetch_world_radiocarbon.py` | Downloads p3k14c (CC0) and the four XRONOS tables (CC BY 4.0) and writes one dated record per site. Dating only: these coordinates never create or move a pin. | one CSV from GitHub, four CSVs from `xronos.ch` | `data/world/dating/xronos_sites.jsonl`, CSVs in `data/world/raw/radiocarbon/` |
| `fetch_featured_coordinates.py` | Fetches the Wikidata coordinate (P625, CC0) of each featured monument. The committed featured list carries no coordinates. | `wikidata.org/w/api.php`, 50 items per request | `data/world/featured_coordinates.json`, raw responses in `data/world/raw/featured/` |
| `build_world_catalogue.py` | Merges the source records, attaches dates, and rewrites the static web catalogue. No network. `--allow-missing <source>` builds without one input. `--generated YYYY-MM-DD` sets the date stamp. | nothing | `Anatolia/atlas/public/world/` (replaced as a whole) |
| `fetch_global_covariates.py` | Fetches ETOPO 2022 relief, HydroSHEDS flow accumulation, and six CHELSA-TraCE21k climate slices, and reduces them to 0.25° grids for `python -m ai_archaeology.suitability`. | two files, about 670 MB together. The climate slices are read over HTTP range requests. | `.npy` grids and `provenance.json` in `data/world/covariates/`, downloads in its `raw/` folder |
| `fetch_paleo_context.py` | Reads CHELSA-TraCE21k surface altitude and ice-sheet altitude (CC0 1.0) at 0.25° for every 500th year from 20,000 BCE, for the globe's ice and sea level layer. | 90 cloud-optimised GeoTIFFs over HTTP range requests, one at a time: only a coarse overview of each 350 MB file is transferred | compressed grids in `data/world/paleo/raw/` and `provenance.json` |
| `build_paleo_context.py` | Classifies each step (ice, land where the sea is today). No network. `--generated YYYY-MM-DD` sets the date stamp. | nothing | `Anatolia/atlas/public/paleo/` (45 PNGs and `index.json`, about 1 MB) |
| `splat/fetch_commons_photos.py` | Fetches the photographs in named Wikimedia Commons categories, with a credit and licence for each, for the walk-view splats. The other steps are in [`splat/README.md`](splat/README.md). | `commons.wikimedia.org`, one request at a time | `data/splat/<site>/images/` and `credits.json` |
| `splat/ply_to_splat.py` | Converts a trained Gaussian-splat `.ply` into the `.splat` file the walk view reads. No network. `--self-check` tests it. | nothing | the path you give, normally `Anatolia/atlas/public/splats/<site>.splat` (committed, CC BY-SA 4.0; other `.splat` files are gitignored) |
| `run_cross_region_smoke.py` | Fetches one Irish LiDAR tile, one USGS 3DEP window, and one Copernicus GLO-30 window, reads the National Monuments Service SMR and one public National Register polygon, trains, and writes a metrics report. | the three small windows and two inventories | `data/cross_region/`, report in `outputs/cross_region/` |

Sizes of the caches after the November 2026 run, as a guide: Wikidata 234 MB (about 30 minutes, 414 requests), Pleiades dump 130 MB, radiocarbon 72 MB, OpenStreetMap 5 MB, featured coordinates 6 MB, ETOPO 445 MB, HydroSHEDS 197 MB, the ice and sea level grids 38 MB (about a minute and a half).

The order for a full rebuild, and what each step is for, is in the [README](../README.md#rebuild-the-data). The file formats are in [`docs/world-catalogue.md`](../docs/world-catalogue.md).

## Scripts that live elsewhere

- `Anatolia/atlas/scripts/` holds the Anatolia terrain builds, the close-up worker (`closeup_window.py`) that the atlas server runs on demand, and the `check_*.mts` checks. See [`Anatolia/atlas/README.md`](../Anatolia/atlas/README.md) and [`docs/world-atlas.md`](../docs/world-atlas.md).
- `Anatolia/explorer/scripts/build_web_assets.py` is the Şanlıurfa terrain build of the earlier explorer. It reads public COGs and writes small viewer files under `Anatolia/explorer/public/terrain/`.

## Rules for a new script

A script should record the dataset name, the date it was fetched, the URL or service, and the licence. The licence goes into [`docs/data-sources.md`](../docs/data-sources.md) before the first download. It should write into `data/` and stop there. It sends a generic User-Agent with no personal details, makes one request at a time per host, and retries with a pause. It must not write coordinates of candidate or undiscovered sites into the repository.
