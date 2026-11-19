# Contributing

This is a private hobby research repository. Keep changes small and readable.

## Ethics

These rules are hard rules:

- Never commit precise coordinates of candidate or undiscovered sites. The risk is looting.
- Shareable maps and figures use coarse or jittered locations only.
- Do not call a candidate a discovery. A candidate stays a candidate until an archaeologist confirms it.
- Respect each dataset's licence. Record it in `docs/data-sources.md` before use. The SE Anatolia register is `Anatolia/data-sources.md`.
- Do not overclaim. Optical imagery, radar, and elevation models do not see through rock or deep sediment.
- The world catalogue holds published records from open-licence sources that are registered in `docs/data-sources.md`. Nothing else goes in. OpenStreetMap (ODbL) and any other share-alike source stay in their own files and layers. Model outputs are published only as coarse 0.25° cells.

## Data

Keep large rasters out of git. `data/` and `outputs/` are ignored, along with `*.tif`, `*.tiff`, `*.laz`, `*.las`, `*.vrt`, `*.zip`, `*.nc`, `*.jp2`, `*.npy`, `*.csv`, `*.json.gz`, and `candidates_private*`. The full list is in `.gitignore`.

Document how to obtain a dataset with a script under `scripts/` instead of committing the file. Raw downloads and source records stay under `data/`. Only the small derived web files under `Anatolia/atlas/public/world/` and `Anatolia/atlas/public/predict/` are committed.

Do not run a download script unless the owner of the repository asked for that download.

## Where things are written down

- [`docs/world-atlas.md`](docs/world-atlas.md): the web app and its checks.
- [`docs/world-catalogue.md`](docs/world-catalogue.md): sources, merge rules, and how to add or correct a featured monument.
- [`docs/suitability-model.md`](docs/suitability-model.md): the model layer and its limits.
- [`docs/inspiration.md`](docs/inspiration.md): the projects and papers this work learned from, with licences.
- [`docs/philosophy.md`](docs/philosophy.md): what the atlas is for, and how ideas and theories are treated.
- [`docs/todo.md`](docs/todo.md): open work, decisions waiting, and what is unverified.
- [`AGENTS.md`](AGENTS.md): the working rules for coding agents, with the run and check commands.

## Code

Keep a file under 700 lines and a function under about 40. One responsibility per file. New logic that is not trivial gets one small test: `pytest` under `tests/` with synthetic inputs, or a `scripts/check_*.mts` file in `Anatolia/atlas` with a pytest wrapper. Tests do not place a grid on a real site.

Run `pytest` before a change is offered. In `Anatolia/atlas`, `npx tsc --noEmit` checks the types.
