# Contributing

This is a private hobby research repository. Keep changes small and readable.

## Ethics

These rules are hard rules:

- Never commit precise coordinates of candidate or undiscovered sites. The risk is looting.
- Shareable maps and figures use coarse or jittered locations only.
- Do not call a candidate a discovery. A candidate stays a candidate until an archaeologist confirms it.
- Respect each dataset's licence. Record it in `docs/data-sources.md` before use. The SE Anatolia register is `Anatolia/data-sources.md`.
- Do not overclaim. Optical imagery, radar, and elevation models do not see through rock or deep sediment.

## Data

Keep large rasters out of git. `data/` and `outputs/` are ignored, along with `*.tif`, `*.tiff`, `*.laz`, `*.las`, `*.vrt`, `*.zip`, `*.nc`, `*.jp2`, and `candidates_private*`.

Document how to obtain a dataset with a script under `scripts/` instead of committing the file.
