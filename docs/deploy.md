# Publishing the atlas on Vercel

How to put the web app (`Anatolia/atlas`) on Vercel as a public site, what works there and what does not. Written 2026-11-19. The app has been built for production and run locally in that form; **it has not been deployed to Vercel**, so everything below about Vercel itself comes from its documentation, not from a test.

The app is described in [`world-atlas.md`](world-atlas.md). Paths below are relative to `Anatolia/atlas` unless they start with `docs/`.

## What the site is made of

- **Static files.** Everything the atlas shows is a file under `public/`: the world catalogue (`public/world/`), the Anatolia site files, the terrain rasters, the recording-pattern and ice layers, and the walk view's splats. The browser fetches them as it needs them. A host serves them as they are.
- **No database for the atlas itself.** The atlas reads no database and writes nothing. A visitor's choices (theme, relief source) are kept in that visitor's browser. The optional accounts (saved sites and votes) are the exception: they use a Neon database and Neon Auth through two server functions, `/api/auth/*` and `/api/account/*`, and need three environment variables. Without those variables the atlas is complete and the two functions answer 503. [`accounts.md`](accounts.md) has the setup, including what to set in Vercel and the trusted domain for the deployed address.
- **One page rendered on request.** `/` reads the address (`?view=…&site=…`) on the server and sends the page for that view. With no parameters it is the globe, so a visitor lands straight in it. On Vercel that is one small function call per page load.
- **Two prerendered pages.** `/puzzles` and `/api/landscape-benchmark` are built once at build time. The second reads `Anatolia/eval/metrics.json`, which lies outside the app folder: see the build setting below.
- **One API that needs a program Vercel does not run.** `/api/closeup`: see "What does not work".

## Vercel settings

Deploy from the Git repository, not with the `vercel` command line: the command line uploads the source files, and Vercel's limit for that on the free plan is 100 MB, which the app's static files alone pass.

| Setting | Value |
| --- | --- |
| Framework preset | Next.js |
| Root directory | `Anatolia/atlas` |
| Include files outside the root directory in the build step | On (the default). `/api/landscape-benchmark` imports `Anatolia/eval/metrics.json`. |
| Build command | The default, `next build` (`npm run build`). |
| Install command | The default, `npm install`. |
| Output directory | The default. Do not set `ATLAS_DIST_DIR` on Vercel. |
| Node.js version | 22 or later. |
| Environment variables | None are needed for the atlas. Accounts need three: see [`accounts.md`](accounts.md). |

Environment variables the app reads:

| Variable | Meaning |
| --- | --- |
| `VERCEL` | Set by Vercel itself. When it is set, the close-up API answers "unavailable" (see below). |
| `ATLAS_CLOSEUPS` | `on` or `off` overrides that guess. Leave it unset on Vercel. `off` is useful on any host without the repository's Python. |
| `ATLAS_PYTHON`, `ATLAS_CLOSEUP_DIR`, `ATLAS_CLOSEUP_MAX_BYTES`, `ATLAS_CLOSEUP_CONCURRENCY` | The close-up worker's settings. They do nothing where close-ups are off. |
| `ATLAS_DIST_DIR` | Build output folder, for a local check build only (below). |
| `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` | Accounts only, and all three or none ([`accounts.md`](accounts.md)). The first and last are secrets. The build reads them to tell the page whether accounts are on, so a change needs a redeploy. |

No key or token is needed for the atlas itself. The globe library (`3d-tiles-renderer`) is used only to drape plain XYZ image tiles on an ellipsoid; nothing in the app calls a keyed service.

## Steps for the owner

1. Decide the open points under "Decisions waiting" in [`todo.md`](todo.md) that concern publishing: the Şanlıurfa regional files, and the base map's terms.
2. Commit and push the changes this document came with.
3. In Vercel, create a project from the repository and apply the settings in the table above. No environment variables, unless accounts are wanted.
4. Deploy. Open the address Vercel gives: it should show the globe.
5. Check on the deployed site: a site card opens; "Open in Anatolia atlas" shows the terrain map; `/?view=walk&site=gobekli-tepe&source=photographs` loads the splat; "View terrain" shows the message "Terrain close-ups are not available here" and a way back; `/puzzles` opens.
6. Look at the build log for the size of each function. The close-up function should be a few megabytes. If the log reports hundreds, the exclusion in `next.config.ts` did not apply: see "The close-up function's size".

## What does not work when deployed, and why

**Terrain close-ups (the place view, "View terrain").** A close-up is built on request by `scripts/closeup_window.py`: Python with rasterio, NumPy and Pillow, which reads elevation tiles over the network, reprojects them and writes four files into a temporary folder. A Vercel Node.js function has no Python and no virtualenv. So on Vercel (`VERCEL` set, or `ATLAS_CLOSEUPS=off`) `/api/closeup` answers 503 with the body `close-up-unavailable`, before any catalogue file is read. The app then degrades:

- The place view shows "Terrain close-ups are not available here", says the site record is fine, and offers the way back. It does not offer "Try again", and it does not wait.
- On the Anatolia map, a catalogue place with no prebuilt relief stays open on the national terrain, with the line "Close-up relief is not built on this hosted copy of the atlas." The 24 sites with prebuilt relief under `public/terrain/details/` are unaffected.
- Two controls still point at the API and now lead to that message or to the plain 503 text: "View terrain" on a globe site card, and the "Relief close-up" link in the Anatolia site panel's Resources. Hiding them on a hosted copy is a small change that has not been made.

The rule that the API takes a published id and never coordinates is unchanged: a request with `lon` or `lat` is still refused with 400.

**The Şanlıurfa regional block on the Anatolia map**, unless its files are committed. `public/terrain/regions/` is ignored by git (12 files, 2.7 MB), so a deploy from git does not have it. Without it the map still works: the 120 m block around Şanlıurfa, its entry in the Base map settings and the flight to the region are absent, and nothing errors (`app/page.tsx` treats the missing file as "no region"). The files are derived from Copernicus DEM GLO-30 and one Sentinel-2 day, and the files they are reprojected from are already in the repository under `Anatolia/explorer/public/terrain/`. Committing them is the owner's decision; `next.config.ts` already packs `metadata.json` into the page's function for when they are.

Everything else was seen working in a local production build: the globe, site cards, search, the timeline, the layers, the Anatolia map, the walk view's models and splats, and the puzzles page.

## Why the close-up worker was not moved to TypeScript

The worker is 140 lines, but it stands on about 900 more (`place_relief.py`, `gem15_tiles.py`, `glo30_tiles.py`, `cog_range.py`, `relief_fill.py`, parts of `build_atlas_terrain.py`) and on rasterio, NumPy and Pillow. A port would have to read cloud-optimised GeoTIFFs by byte range, decompress them, reproject from UTM and geographic grids to Web Mercator, decode and stitch JPEG tiles, and encode JPEGs. That is several hundred lines and at least two new dependencies (a GeoTIFF reader and a JPEG codec), against the rule of no new dependency for the app. Ways to bring close-ups to a hosted copy, none of them started:

| Option | Cost |
| --- | --- |
| Port the worker to TypeScript | Roughly 600 to 900 lines and two or three dependencies. Each cold function builds again (10 to 15 s locally), because a function's temporary folder is not shared between instances, so it also needs somewhere to keep results. |
| A Python function on Vercel running the existing worker | Little new code, but the id-to-point lookup must exist in Python too, the Python bundle (rasterio, NumPy, Pillow) must fit Vercel's 500 MB limit, and results still need somewhere to live. |
| Build the place view in the browser from an open terrain tile set | No server at all. Needs a tile source registered in `docs/data-sources.md` with terms that allow it, and gives that source's resolution in place of 15 m. |
| Prebuild close-ups for the featured sites as static files | No server. Adds roughly 0.5 to 1 MB a site to the repository, and the satellite image is CC BY-NC-SA, which must stay in its own files. |

Vercel function limits that any of these meets, as documented on 2026-11-19 for the free plan: 300 s per call, 2 GB of memory and one CPU, a read-only filesystem with a temporary folder of up to 500 MB that belongs to one instance and is lost when it stops, 250 MB per Node.js function, and 4.5 MB per response unless streamed.

## The close-up function's size

`lib/closeupCache.ts` and `lib/closeupCatalog.ts` name `public/` and the repository's `.venv` by path. Next's file tracer therefore packs both into the close-up function: 530 MB in a local build, where Vercel's limit is 250 MB. `outputFileTracingExcludes` in `next.config.ts` leaves them out, which is safe because a serverless host refuses close-ups before reading either.

On Windows that exclusion is not applied, because of how Next joins the paths, so a local build there still lists the files. Applying the same patterns to the same list with forward slashes, as Linux has them, leaves 70 files and 1.5 MB. Vercel builds on Linux, but this has not been seen in a Vercel build log: check it on the first deploy.

## Tile hosts and other third parties

The deployed site makes the visitor's browser fetch from these hosts. The pages were read on 2026-11-19.

| Host | Used for | What its pages say |
| --- | --- | --- |
| `tiles.maps.eox.at` (EOX) | The globe's default imagery, Sentinel-2 cloudless 2020. | Licence summary (`cloudless.eox.at/documentation/license`): CC BY-NC-SA 4.0, "You may use EOxCloudless freely for non-commercial purposes", with personal use, education and research as examples; "Web services and commercial dashboards" is listed under commercial use, which needs a paid licence. "For interactive maps, the credit should appear in the map interface." The required credit is now `EOxCloudless https://cloudless.eox.at by EOX IT Services GmbH (Contains modified Copernicus Sentinel data "year")`. The tile service's own page (`maps.eox.at`): "The demo service is provided as is without any guarantee", "Just feel free to use them", "We just ask for a link back to EOX::Maps as well as appropriate attribution", and it says rate limiting is applied under load. **No page read says in so many words that a public website may use the free tile endpoint.** A non-commercial site with the credit shown fits the licence as written; whether this site counts as non-commercial, and whether the demo endpoint is meant for it, is for the owner to judge or to ask EOX. |
| `gibs.earthdata.nasa.gov` (NASA GIBS) | The globe's fallback imagery and second base map, Blue Marble. | API documentation (`nasa-gibs.github.io/gibs-api-docs`): "NASA promotes full and open sharing of data", and it asks clients that use GIBS to add the acknowledgement "We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS)." No registration, key or rate limit is stated. NASA's data use guidance says NASA material may not be used to imply NASA's endorsement. Nothing read restricts use on a public website. |
| `commons.wikimedia.org` | The photograph on a globe site card, loaded from Commons at a set width. | Commons, "Reusing content outside Wikimedia/technical": "Hotlinking is allowed from Wikimedia servers, but is not generally recommended", and "it is still necessary to follow the licensing conditions". The card links the file's own page, which carries author and licence. |

Not fetched by a deployed site: the elevation hosts the close-up worker reads (`storage.googleapis.com` for GEM-15, `copernicus-dem-30m.s3.amazonaws.com` for GLO-30) and the EOX tiles it stitches. They are used only where close-ups are built. Their licences are in [`data-sources.md`](data-sources.md); their hosts' terms for automated use were not read again for this document.

The globe's attribution line still uses EOX's earlier wording ("Sentinel-2 cloudless – https://s2maps.eu …"). `lib/globe/basemaps.ts` should take the current one: it is in [`todo.md`](todo.md).

Vercel's free plan: its documentation lists 100 GB of data transfer, 1,000,000 function calls and 4 CPU-hours a month, and says that past a limit the feature is unavailable until 30 days have passed. Vercel's terms on who may use the free plan were not read; read them before publishing.

## Size of the deploy

Measured on 2026-11-19 from the files tracked in git. `public/world/` was being rebuilt that day, so its figure may have moved.

| Part | Size |
| --- | --- |
| All tracked files in the repository (what Vercel clones) | about 112 MB, 1,842 files |
| `public/`, served as static files | about 104 MB, 1,151 files |
| of which `public/world/` (catalogue) | 47 MB |
| of which `public/splats/` (walk view) | 29 MB; the largest single file is the Göbekli Tepe splat, 27 MB |
| of which `public/terrain/` | 17 MB |
| JavaScript for the first page | 360 kB |
| Each server function, without the excluded files | about 1.5 MB |

A visit to the globe fetches a few megabytes before compression (`core.json` is 2.6 MB). A visit to the Göbekli Tepe photographs fetches the 27 MB splat, so the free plan's 100 GB covers about 3,700 of those a month.

## A production build beside the dev server

`next build` writes into `.next`, which a running dev server is using. For a check build, send the output elsewhere:

```bash
cd Anatolia/atlas
ATLAS_DIST_DIR=.next-check npx next build
git checkout -- tsconfig.json next-env.d.ts   # the build rewrites both to name the folder
rm -rf .next-check
```

To see it run as a hosted copy would, before removing the folder: `VERCEL=1 ATLAS_DIST_DIR=.next-check npx next start -p <a free port> -H 127.0.0.1`. That is a production server, not a second dev server. `.next-*` folders are ignored by git.

## Checks

`scripts/check_closeup_cache.mjs` covers the switch (`closeupsAvailable`) and the 503 answer; `check_place_view.mts` covers which failure the place view shows for which status; `check_relief_load.mts` covers the Anatolia map's line. Each has its pytest wrapper under `tests/`.
