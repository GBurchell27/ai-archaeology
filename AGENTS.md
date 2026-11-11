# Notes for agents

This is a private learning and research hobby, not a product and not a search for loot.

## Ethics

- Never commit precise coordinates of candidate or undiscovered sites. The risk is looting.
- Shareable outputs use coarse or jittered locations only.
- A candidate is never a discovery. Only an archaeologist can confirm a site.
- Respect each dataset's licence. Record it in `docs/data-sources.md` before use. The SE Anatolia register is `Anatolia/data-sources.md`. Do not add coordinates of unpublished or candidate sites to it.
- Do not overclaim. Optical imagery, radar, and DEMs cannot see through rock or deep sediment.

## Data

Keep large rasters out of git. Document download scripts in `scripts/` instead of committing the rasters they fetch. `data/`, `outputs/`, common raster extensions, and `candidates_private*` are gitignored.

Do not download real datasets unless the person responsible for this repo explicitly asks for that download.
