# The world atlas web app

The app lives in `Anatolia/atlas` (Next 15, React 19, three.js, React Three Fiber). Paths below are relative to that folder unless they start with `src/`, `scripts/` or `tests/`. How to run it is in [`Anatolia/atlas/README.md`](../Anatolia/atlas/README.md). The data it reads is described in [`world-catalogue.md`](world-catalogue.md) and [`suitability-model.md`](suitability-model.md).

## Four views and one coordinator

`app/page.tsx` renders `components/WorldCoordinator.tsx`. The coordinator owns which view is showing, the crossfade between views, and the address bar. Nothing else writes the URL, apart from the model layer's one parameter.

| View | Component | What it is |
| --- | --- | --- |
| `globe` | `components/globe/GlobeExplorer.tsx` | The world globe, its sites, and its chrome. |
| `atlas` | `components/AtlasApp.tsx` | The Anatolia terrain atlas. Its state lives in the hooks under `components/atlas/`. |
| `place` | `components/place/PlaceView.tsx` | A standalone terrain close-up of one published site. |
| `walk` | `components/walk/WalkView.tsx` | A walk through the Gaussian splat of one site listed in `lib/walk/walkSites.ts`. |

Each view owns a WebGL canvas, so each is loaded with `next/dynamic` and mounted only while it is on screen. A transition gives the new view a fresh key, fades the old one out for 620 ms, then unmounts it. One canvas is alive afterwards.

Handoffs:

- **Globe to atlas.** `lib/globe/handoff.ts`. Inside the Turkey bounds (25.5–45°E, 35.8–42.2°N) the globe offers the atlas below 900 km and enters it when a zoom crosses 450 km. A link that opens low over Turkey does not bounce straight in. "Open in Anatolia atlas" on a site card enters with that site's id.
- **Atlas to globe.** The Globe button, or zooming well past the overview (`components/atlas/useGlobeExit.ts`). The globe reopens at 1,500 km, above the offer line.
- **To a place and back.** "View terrain" on a site card. Leaving returns to the view you came from, and on the globe the card of that site reopens.
- **Atlas to a walk and back.** `lib/atlas/walkHandoff.ts`, `components/atlas/useWalkEntry.ts`. Only for the sites in `lib/walk/walkSites.ts`. "Walk the site" on the site panel enters. So does zooming: with the camera looking within 800 m of the site, the atlas offers the walk below a camera distance of 3,000 m and enters it when a zoom crosses 700 m. A camera that starts below 700 m does not bounce straight in, flights do not count, and the zoom entry is off while the trip replay is open. On the way in the atlas camera pushes at the site and the fading layer swells (`.diving` in `WorldCoordinator.module.css`); neither happens under `prefers-reduced-motion`. Back returns to the atlas with that site selected, at the usual site distance, which is above the offer line.

## URL scheme

`lib/globe/viewUrl.ts` parses and writes it. The coordinator uses `history.replaceState`, so the back button is not filled with camera moves. While the globe moves, the URL is written at most every 400 ms.

| Address | Meaning |
| --- | --- |
| `?view=globe&lon=38.00&lat=30.00&alt=13000` | The point at the centre of the screen, to 2 decimals, and the camera altitude in whole kilometres. Altitude is clamped to 100–40,000 km. |
| `…&site=<id>` on a globe address | The site whose card is open. |
| `…&model=<layerId>` on a globe address | The recording-pattern layer that is switched on (`components/globe/model/modelUrl.ts`). |
| `?view=atlas` or `?view=atlas&site=<id>` | The Anatolia atlas, optionally opened on a site. An id the Anatolia catalogue does not know is ignored. |
| `?view=place&site=<id>` | The close-up of one site. |
| `?view=walk&site=<id>` | The walk through one site. An id with no walk opens the atlas instead, and the address is corrected to `?view=atlas&site=<id>`. |

No parameters means the globe at its default look (38°E, 30°N, 13,000 km) with a slow idle turn. A site id must match `^(?:Q\d+|[a-z0-9]+(?:-[a-z0-9]+)*)$`. Anything else is dropped. No address ever carries a site's coordinates: a link names a published id.

## The globe scene

`components/globe/GlobeView.tsx` owns the canvas. `GlobeSurface.tsx` draws the Earth with `3d-tiles-renderer`: a generated WGS84 ellipsoid with XYZ imagery draped on it, and `GlobeControls` for orbit, zoom and tilt.

**Frame.** The scene is Earth-centred Earth-fixed, in metres, and the tiles group is not rotated. So scene coordinates are ECEF coordinates:

- +X leaves the Earth at 0°E 0°N
- +Y at 90°E 0°N
- **+Z at the north pole.** "Up" is +Z, not three's usual +Y.

Use `lonLatHeightToScene(lon, lat, height)` and `sceneToLonLatHeight` from `lib/globe/ellipsoid.ts`. They take degrees. Do not write your own conversion.

Things that catch people out:

- The canvas uses a **logarithmic depth buffer** (near 10 km, far 10⁹ m). A custom `ShaderMaterial` needs the `logdepthbuf` shader chunks or it will z-fight or vanish.
- `GlobeControls` raycasts the tiles only, so points and atmosphere shells never become the drag pivot. Give a new mesh a no-op `raycast`.
- Draw order is set by `renderOrder`: model overlay 3, haze 4, glow 5, site points 6 and above.
- The camera cannot come closer than 60 km. Detail belongs to the place view.
- `GlobeView` reports the look (centre point and altitude) about 8 times a second. Keep it in a ref unless the component really must re-render.

**Imagery.** `lib/globe/basemaps.ts` lists the basemaps. The first is the default. If its host does not answer a probe, the second is used. Tiles are streamed and never stored. The attribution line under the globe comes from the same entry.

## How sites are loaded and drawn

Loading (`lib/world/catalogueLoader.ts`, `lib/world/cellLoader.ts`, `components/globe/useSiteLayers.ts`):

1. At start: `index.json`, `core.json` (40,000 sites) and `featured.json`.
2. Below 2,500 km of altitude: the 10° cells in view, nearest first, at most 40 at a time. A cell is fetched once. The cache keeps 48 cells and forgets the least recently wanted.
3. When the OpenStreetMap layer is switched on: `osm-megaliths.json`, once.
4. When the search box is first focused: `names.json`, so search covers the sites whose cells are not loaded.
5. When a card opens: one `detail/<bucket>.json` shard.

Drawing (`lib/globe/siteBlock.ts`, `components/globe/GlobeSitePoints.tsx`, `sitePointsMaterial.ts`): each block of columns becomes typed arrays and **one `THREE.Points` draw call**. The shader hides the far side of the globe, sizes a point by how well known the site is, and fades from a soft glow in orbit to solid dots close up. Colour comes from the site type (`lib/world/siteTypeStyle.ts`). The filter does not rebuild geometry. It writes a per-point "shown" attribute (`lib/world/siteFilter.ts`).

On top of the points: featured markers with serif names (`GlobeFeaturedMarkers.tsx`, label placement in `lib/globe/labelLayout.ts`), count badges where points crowd (`GlobeClusterBadges.tsx`, one-degree buckets from `lib/globe/siteGrid.ts`), and a ring on the selected site.

## Picking

`components/globe/useGlobePicking.ts`. There is no GPU picking and no raycast against the points.

1. The pointer ray is intersected with the ellipsoid (`intersectRayWithEllipsoid`).
2. A pixel tolerance (9 px for a mouse, 20 px for touch) is turned into degrees on the ground at that distance.
3. The one-degree bucket grid of each drawn block returns the nearest shown site within that reach. A featured site wins over an ordinary neighbour unless that one is much closer.

A press and release within 5 px is a click. A drag is not. Hover runs at most every 50 ms and feeds the tooltip.

Known limit: the tolerance is measured on the ground, so it shrinks towards the limb where the surface is foreshortened.

## The globe chrome

`components/globe/useGlobeExplorer.ts` is the view model: catalogue, filters (`useSiteFilter.ts`), selection (`useSiteSelection.ts`), the wonder tour, and which panel is open. `components/globe/chrome/ExplorerChrome.tsx` lays out the DOM over the canvas and is memoised, so camera movement does not re-render it. The overlay layer ignores the pointer. Controls opt back in.

The recording-pattern layer is separate: `components/globe/model/`. `useModelLayer.ts` holds its state, `GlobeModelOverlay.tsx` draws the raster on a shell with nearest-neighbour sampling so each cell is one flat colour, and `ModelControls.tsx` mounts in the Layers panel. It is off by default. It fades out as the camera comes low enough for a single cell to look like detail. All of its wording is in `modelWording.ts`, so the honesty of the text can be reviewed in one file.

## The place view

`components/place/PlaceView.tsx` takes `{ siteId, onExit }`.

- `lib/place/placeSite.ts` finds the site's name, type, dates and credit from the catalogue files.
- `lib/place/placeTerrain.ts` asks the close-up API for `meta`, which triggers the build, then for `height`. It gives up after 135 s.
- `components/place/PlaceScene.tsx` builds the terrain mesh with a skirt, drapes the satellite image or the hillshade, and lights it with a movable low sun. Geometry helpers are pure functions in `lib/place/placeGeometry.ts`.

The scene here is a local Web Mercator block, not ECEF. Heights are scaled by `1 / cos(latitude)` to match the Mercator stretch.

## The walk view

`?view=walk&site=<id>` (`components/walk/`) is the coordinator's fourth view, entered from the Anatolia atlas. It shows a Gaussian splat of one site with a visitor inside it, who can walk on the floor or fly above it.

- `lib/walk/walkSites.ts` lists the sites, and for each the splat file, eye height, walk radius and alignment. An id that is not listed has no walk: the coordinator opens the atlas instead.
- Keys: click to look around (pointer lock, Esc frees it), W A S D or the arrows to move, Shift to move faster, F to switch between walking and flying, E and Q to rise and sink while flying, R to return to the start. `lib/walk/walkKeys.ts` holds the layout. Space is left alone because it would press the focused button.
- `lib/walk/walkMovement.ts` is the pure movement maths: the velocity eases towards what the keys ask for, so starts and stops are smooth at any frame rate. A walker stays at eye height inside the walk radius. A flyer stays inside a dome of three times that radius, between 0.4 m and a ceiling of twice the radius, capped at 40 m. Leaving fly mode eases down to eye height, and a walker who lands outside the walk radius can walk in but not further out.
- `components/walk/WalkControls.tsx` applies it each frame and reports pointer lock. Only elements marked by `pointerLockTrigger.ts` (the scene and the entry prompt) lock the pointer, so the buttons stay clickable.
- `components/walk/WalkView.tsx` is the chrome: `WalkView({ site, onExit })` shows a Back button when `onExit` is given and a link to `/` otherwise. `WalkHud.tsx` is the entry prompt with the key legend and the mode button. A note shows while the splat loads.
- Hooks for browser checks on `[data-view='walk']`: `data-walk-state` (`checking`, `ready`, `missing`), `data-walk-shown`, `data-walk-mode` (`walk`, `fly`), `data-walk-locked`. Also `[data-role='walk-prompt']` and `[data-role='walk-mode']`.
- `components/walk/WalkScene.tsx` draws the splat with drei's `<Splat>`, which reads the 32-byte `.splat` format and already turns y-down capture data upright.
- The splats live in `public/splats/` and are gitignored: they are built from share-alike photographs by the steps in [`scripts/splat/README.md`](../scripts/splat/README.md). Without the file the page says so.

Limits: a splat has no surfaces, so there is no collision, only a flat floor and a radius. It is a reconstruction from visitors' photographs, not a survey.

## The close-up API

`GET /api/closeup?id=<id>&part=<part>[&terrain=copernicus]` (`app/api/closeup/route.ts`, `lib/closeupCache.ts`, `lib/closeupCatalog.ts`).

| `part` | Returns |
| --- | --- |
| `meta` (default) | JSON: `bounds` (EPSG:3857 west, south, east, north), `width`, `height`, `pixelSizeM` (Mercator), `groundPixelSizeM`, `elevation` (`min`, `max`), `attribution` (`relief`, `satellite`). |
| `height` | `width × height` unsigned 16-bit values, scaled between `elevation.min` and `elevation.max`. Decode with `decodeHeight` in `lib/terrain.ts`. |
| `hillshade` | JPEG, light from 315° at 45°. |
| `satellite` | JPEG, EOX Sentinel-2 cloudless 2020. |

Rules and limits:

- **The request carries a published id, never coordinates.** A request with `lon` or `lat` is refused with 400. The id is resolved to a point from the Anatolia site files, then from `public/world/detail/<bucket>.json`.
- An unknown id, or a site beyond **80° north or south**, is 404. Web Mercator stretches without bound towards the poles.
- A window that would cross the **180° meridian** is refused by the worker and comes back as 502.
- The window is **10 km across on the ground**. Relief is the GEM-15 surface model at 15 m, so about 667 pixels a side. Where GEM-15 has no data (Russia, China, Mongolia, Greenland, and south of 61°S) the worker falls back to Copernicus GLO-30. `terrain=copernicus` asks for GLO-30 directly.
- The server builds a window by running `scripts/closeup_window.py` with the repository virtualenv's Python, or `ATLAS_PYTHON`. The worker reads open elevation tiles over the network. It is stopped after 120 s. A first build takes roughly 10 to 15 s.
- One build per id, shared by all callers. At most 2 builds at once (`ATLAS_CLOSEUP_CONCURRENCY`).
- Results are cached in a private temporary directory, or `ATLAS_CLOSEUP_DIR`. The cache is capped at 64 MB (`ATLAS_CLOSEUP_MAX_BYTES`), and the least recently used sites are evicted. Nothing is written into the repository.
- Other failures are 502 with the body `close-up-failed`. The detail goes to the server log.

It shows a surface model at 15 m. It can show a tell, a terrace or a large enclosure in its landscape. It cannot show a wall.

## Where to add things

**A new site type.**

1. Append it to `SITE_TYPES` in `src/ai_archaeology/world/records.py`. `index.json` carries the list, so the web files stay self-describing.
2. Teach the ingesters to assign it: `SITE_TYPE_RULES` in `wikidata_world.py` and in `pleiades_world.py`. First match wins, so order matters.
3. Give it a title and colour in `lib/world/siteTypeStyle.ts`. Without one it is drawn as "Other sites".
4. If the model should count it, add it to a class in `src/ai_archaeology/suitability/labels.py`.
5. Rebuild the catalogue and run the tests.

**A new basemap.** Record its licence in `docs/data-sources.md` first. Add an entry to `GLOBE_BASEMAPS` in `lib/globe/basemaps.ts` with its XYZ template, maximum level, licence and attribution. Today only the first two entries are used, as default and fallback. A picker would need a control and a way to pass the choice to `GlobeSurface`.

**A new panel.** Add its name to `ExplorerPanel` in `useGlobeExplorer.ts`, a button to `PANEL_BUTTONS` in `chrome/ExplorerTopbar.tsx`, and a branch in the side slot of `chrome/ExplorerChrome.tsx`. Build it on `chrome/PanelShell.tsx`. Keep its styles in a CSS module next to it.

**A new layer on the globe.** Pass it through the `sceneLayers` prop of `GlobeExplorer`, as the model overlay does. Work in the ECEF frame, include the log-depth chunks, and choose a `renderOrder`.

**An external link.** Links in cards go through `components/SafeLink.tsx`, which allows only the https hosts listed in `lib/externalHref.ts`. A new source needs its host added there.

**A new data source.** That is a catalogue change. See [`world-catalogue.md`](world-catalogue.md).

## Checks

Logic checks are Node scripts under `scripts/`, run with type stripping (Node 22.6 or later). Each prints `{"ok":true…}` and exits non-zero on a failure. From `Anatolia/atlas`:

```bash
node --experimental-strip-types scripts/check_globe_math.mts
```

Each has a pytest wrapper, so `pytest` at the repository root runs them all.

| Check | Wrapper | What it covers |
| --- | --- | --- |
| `check_globe_math.mts` | `tests/test_globe_math.py` | Ellipsoid round-trips, the view URL, the handoff thresholds of the globe and of the walk. |
| `check_world_catalogue.mts` | `tests/test_world_catalogue_web.py` | Cell and detail keys against the files on disk, filter semantics, cell choice, the picking grid, label layout. |
| `check_site_search.mts` | `tests/test_site_search.py` | Search ranking and diacritic folding. |
| `check_place_view.mts` | `tests/test_place_view.py` | Close-up geometry: height scaling, camera framing, scale bar, skirt. |
| `check_model_overlay.mts` | `tests/test_model_overlay.py` | The model raster mapping, the colour ramp, the layer index, which layers beat the baseline. |
| `check_walk.mts` | `tests/test_walk.py` | The walk view: keys to intent, ground steps, the walk radius, the site list. |
| `check_closeup_cache.mjs` | `tests/test_closeup_cache.py` | The close-up cache: id validation, path safety, eviction, concurrency. The Python side of the same test file checks the 10 km window and the refusal at the poles and the 180° meridian. |
| `check_safelink.mjs` | `tests/test_safelink.py` | The external link allowlist. |
| `check_pin_scale.mts`, `check_timeline.mts`, `check_relief_load.mts`, `check_place_resources.mts` | same names under `tests/` | The Anatolia atlas: pin sizes, the timeline, relief loading, the Sources shard. |
| `check_trip.mts` | none | The trip timeline. It needs bundling first. See the atlas README. |

`npx tsc --noEmit` in `Anatolia/atlas` checks the types.

### Browser checks

`check_detail_coverage.mjs`, `check_panel_flight.mjs` and `check_timeline_keys.mjs` drive the Anatolia atlas in headless Chrome with puppeteer-core, against the dev server at `http://127.0.0.1:43127/`. They launch `/usr/bin/google-chrome-stable`, and one writes under `/tmp`. So they run on Linux as written. The first page of the app is now the globe, and these scripts have not been re-run for this document.

On Windows, run the rest of the suite without them:

```bash
pytest --deselect tests/test_detail_coverage.py --deselect tests/test_panel_flight.py::test_rapid_clicks_escape_and_midflight_close --deselect tests/test_timeline_keys.py
```

For a browser check of your own on Windows, puppeteer-core works with the installed Chrome and software WebGL. This was run against the dev server for this document:

```js
import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--window-size=1280,800"],
});
const page = await browser.newPage();
await page.goto("http://127.0.0.1:43127/?view=globe", { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-role='site-status']", { timeout: 60000 });
console.log(await page.$eval("main", (main) => main.dataset.worldView));
await browser.close();
```

Save it inside `Anatolia/atlas` so Node finds puppeteer-core, and run it with `node`. Software rendering is slow: allow a minute or more for the globe to settle. Do not wait for `networkidle0`, because the globe keeps streaming tiles. Useful hooks are the `data-*` attributes: `main[data-world-view]`, `[data-view='globe']`, `[data-role='site-status']`, `[data-role='globe-look']`, `[data-action='view-terrain']`, `[data-action='walk-site']` on the atlas site panel, `[data-action='walk-offer']` on the zoom prompt, and `[data-place-state]` on the place view (`loading`, `ready`, `error`). Look at a screenshot before trusting a pass.

## File map

```
app/page.tsx                      server entry: reads the URL, renders the coordinator
app/api/closeup/route.ts          the close-up API
components/WorldCoordinator.tsx   view switching, crossfade, address bar
components/globe/                 GlobeView, GlobeSurface, GlobeAtmosphere, GlobeFlight,
                                  GlobeSites and its parts, picking, selection, filters
components/globe/chrome/          top bar, search, timeline, legend and type filter,
                                  Wonders, Layers and About panels, site card, tour bar
components/globe/model/           the recording-pattern overlay and its controls
components/place/                 the place view
components/atlas/                 hooks the Anatolia atlas (AtlasApp) is split into,
                                  the walk offer and entry
components/walk/                  the walk view
lib/globe/                        ellipsoid maths, view URL, handoff, basemaps,
                                  site blocks, bucket grid, label layout
lib/world/                        catalogue types and loaders, filter, search, styles,
                                  wonders, eras, model index
lib/place/                        place site lookup, terrain loading, geometry, drapes
lib/atlas/walkHandoff.ts          when the atlas offers and enters a walk
lib/walk/                         walkable sites, walk keys and movement
lib/closeupCache.ts, closeupCatalog.ts   server side of the close-up API
scripts/closeup_window.py         the Python worker that builds a close-up
scripts/check_*.mts, check_*.mjs  the checks
public/world/, public/predict/    the static data
```
