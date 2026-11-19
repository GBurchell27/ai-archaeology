# Notes for agents

This is a private learning and research hobby: a world atlas of published archaeological sites. It is not a product and not a search for loot.

## Ethics

- Never commit precise coordinates of candidate or undiscovered sites. The risk is looting.
- Shareable outputs use coarse or jittered locations only.
- A candidate is never a discovery. Only an archaeologist can confirm a site.
- Respect each dataset's licence. Record it in `docs/data-sources.md` before use. The SE Anatolia register is `Anatolia/data-sources.md`. Do not add coordinates of unpublished or candidate sites to it.
- Do not overclaim. Optical imagery, radar, and DEMs cannot see through rock or deep sediment.
- The world catalogue holds published records from registered open-licence sources only. OpenStreetMap (ODbL) and any other share-alike source stay in their own files and layers and are never merged into the rest. Model outputs ship only as coarse cells (0.25°), never as points.
- No address (URL) carries site coordinates. Addresses use site ids.
- Invent no archaeology. A reconstruction shows only what a registered source states. A figure chosen by eye is marked `[EST]` in the data file. A conjecture is a labelled hypothesis layer, off by default, naming whose hypothesis it is. State interpretations as interpretations.

- Theories and open questions are welcome in their own layer and records, each with its proponent, its sources, its evidence for and against, and a status from the ladder in `docs/philosophy.md`. They never alter a site's published record and are never drawn as if excavated. The atlas reports who says what; it does not conclude for the reader.

## Data

Keep large rasters out of git. Document download scripts in `scripts/` instead of committing the rasters they fetch. `data/`, `outputs/`, common raster extensions, `*.ply`, `*.splat`, `Anatolia/atlas/public/splats/` and `candidates_private*` are gitignored.

Do not download real datasets unless the person responsible for this repo explicitly asks for that download. That covers photographs, video, 3D models and model weights too. Never fetch from a source without a clear open licence and permission for automated access.

Send no personal details to any service. The only contact string approved for the Wikimedia User-Agent is the repository URL (`COMMONS_USER_AGENT`, see `scripts/splat/README.md`).

## Where things are

| Path | What it is |
| --- | --- |
| `Anatolia/atlas/` | The web app: Next 15, React 19, three.js with react-three-fiber and drei. One page, four views: globe, Anatolia terrain map, place close-up, walk. |
| `Anatolia/atlas/components/`, `lib/` | React components, and pure logic with no React. `components/walk` and `lib/walk` are the walk view. |
| `Anatolia/atlas/scripts/check_*.mts` | Logic checks for `lib/`, run by Node directly. `tests/` wraps each one in pytest. |
| `src/ai_archaeology/` | The Python pipeline: catalogue, relief, suitability model. |
| `scripts/` | Download and build scripts. `scripts/splat/` builds the walk view's Gaussian splats. |
| `tests/` | The pytest suite, Python and web together. |
| `docs/` | The written record. See the next table. |
| `data/`, `outputs/` | Local only, gitignored. `data/splat/_diagnose/` holds review screenshots and scratch renders. |

## Read first

Read the one that covers your change before editing:

| Document | Covers |
| --- | --- |
| `docs/philosophy.md` | What the atlas is for and how to decide what belongs in it: ideas ranked by evidence, facts kept apart from readings and theories. Decide unclear design choices by it. |
| `docs/world-atlas.md` | The web app: its views, the URL scheme, the walk view, the close-up API, the file map and the checks. |
| `docs/world-catalogue.md` | Sources, merge rules, the featured tier, and the web file formats. |
| `docs/suitability-model.md` | The coarse recording-pattern layer, its metrics, and its limits. |
| `docs/data-sources.md` | Every dataset and published source in use, with its licence. Add a row before using a new one. |
| `scripts/splat/README.md` | Photographs to COLMAP to Brush to `.splat`, with the settings that worked. |
| `docs/todo.md` | Open work, decisions waiting on the owner, and what is unverified. Update it when you finish or find something. |

Update the document when you change what it describes.

## Running

Run Python from the repository root with the project virtualenv: `.venv/Scripts/python` on Windows, `.venv/bin/python` elsewhere.

```bash
cd Anatolia/atlas && npm run dev      # http://127.0.0.1:43127
```

- Reuse a dev server that is already on port 43127. Never start a second one.
- Under many rapid edits the dev server can answer every route with a plain 500. Updating the timestamp of `Anatolia/atlas/next.config.ts` makes it reload itself.
- Walk view addresses: `/?view=walk&site=gobekli-tepe`, `/?view=walk&site=karahan-tepe`, with `&source=photographs` for the splat.

## Checks before you say it is done

```bash
cd Anatolia/atlas
npx tsc --noEmit
node --experimental-strip-types scripts/check_walk.mts
node --experimental-strip-types scripts/check_globe_math.mts
cd ../.. && .venv/Scripts/python -m pytest -q
```

- Run every `scripts/check_*.mts` that covers a file you touched. New pure logic gets a check in the matching script.
- Three browser tests are sensitive to machine load on Windows (`test_detail_coverage`, `test_panel_flight::test_rapid_clicks_escape_and_midflight_close`, `test_timeline_keys`). If one fails, run it alone before believing it. `docs/world-atlas.md` has the deselect command.
- `tests/test_no_candidate_coordinates.py` rejects any tracked file with two adjacent numbers of four or more decimals, because they look like a coordinate pair. Write alignment values, shader constants and the like with at most three decimals. Do not weaken the test.
- For anything visual, look at it. Headless Chrome with software WebGL works against the dev server (`Anatolia/atlas/scripts/atlasBrowser.mjs` shows how). Pointer lock does not work headlessly, so mouse look cannot be tested that way: say so.
- Report what you ran and what you did not. A software-rendered screenshot is not the owner's GPU.

## Code rules

- No file over 700 lines. No function over 30 to 40 lines.
- One responsibility per file, component and function. Split when a second one appears.
- Pure maths and data live in `lib/`, separate from React components, so a check script can import them.
- Names say what the thing is for. No `data`, `info`, `helper`, `temp`.
- Reuse what exists: theme tokens in `Anatolia/atlas/app/theme.css`, existing helpers, the existing pattern in the folder you are in.
- No new dependency for a few lines of code. No downloaded textures or models in the app.
- Respect `prefers-reduced-motion`. Keep controls reachable by keyboard and labelled.
- The target machine has an integrated Intel GPU: instanced meshes, one shadow map drawn once, no post-processing passes, no per-frame JavaScript over all catalogue points.

## Working rules

- Commit or push only when the owner asks.
- Remove temporary debug hooks before you finish (`window.__…` camera handles and the like). `__atlasCamera` and `__atlasControls` in `components/AtlasCamera.tsx` are intended and stay.
- Keep a backup under `data/splat/<site>/` before replacing a published splat.
- One heavy job at a time (COLMAP or Brush). The machine is short on memory: cap COLMAP at four threads and pass `use_gpu 0`. If the system stops a job for low memory, do not restart it unasked.
- When several agents work at once, agree which files each owns and stay out of the others'. Never run a scratch script you did not write.
- Decisions that belong to the owner go in `docs/todo.md` under "Decisions waiting". Do not make them.

## The walk view in one paragraph

A site in `lib/walk/walkSites.ts` can have two sources behind a toggle. **Model** is a procedural schematic built from a sourced layout file (`gobekliTepeLayout.ts`, `karahanTepeLayout.ts`): every figure is commented with its source or `[EST]`. **Photographs** is a Gaussian splat built from openly licensed visitors' photographs, with its credits file beside it. Landmark cards (`*Landmarks.ts`) carry a source each. Hypothesis layers (`*Hypotheses.ts`) are off by default and attributed. The footer always says which of the two the visitor is looking at, and flags any hypothesis layer that is on. To add a site, add a layout, a model, landmarks and a row in `walkModels.ts` and `walkLandmarks.ts`; `docs/world-atlas.md` has the detail.
