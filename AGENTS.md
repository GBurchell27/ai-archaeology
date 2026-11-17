# Notes for agents

This is a private learning and research hobby: a world atlas of published archaeological sites. It is not a product and not a search for loot.

## Ethics

- Never commit precise coordinates of candidate or undiscovered sites. The risk is looting.
- Shareable outputs use coarse or jittered locations only.
- A candidate is never a discovery. Only an archaeologist can confirm a site.
- Respect each dataset's licence. Record it in `docs/data-sources.md` before use. The SE Anatolia register is `Anatolia/data-sources.md`. Do not add coordinates of unpublished or candidate sites to it.
- Do not overclaim. Optical imagery, radar, and DEMs cannot see through rock or deep sediment.
- The world catalogue holds published records from registered open-licence sources only. OpenStreetMap (ODbL) and any other share-alike source stay in their own files and layers and are never merged into the rest. Model outputs ship only as coarse cells (0.25°), never as points.

## Data

Keep large rasters out of git. Document download scripts in `scripts/` instead of committing the rasters they fetch. `data/`, `outputs/`, common raster extensions, and `candidates_private*` are gitignored.

Do not download real datasets unless the person responsible for this repo explicitly asks for that download.

## Notes for agents working on the world atlas

Read the one that covers your change first:

- `docs/world-atlas.md`: the web app, its three views, the URL scheme, the close-up API, and the checks.
- `docs/world-catalogue.md`: sources, merge rules, the featured tier, and the web file formats.
- `docs/suitability-model.md`: the coarse recording-pattern layer, its metrics, and its limits.
