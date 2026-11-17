# The recording-pattern layer

Code: `src/ai_archaeology/suitability/`. Inputs: `scripts/fetch_global_covariates.py` and the source records under `data/world/sources/`. Output: `Anatolia/atlas/public/predict/`.

## What it is, and what it is not

Ten coarse world rasters. Each one shows **where published sites of one kind and period tend to be recorded**, relative to other cells that hold any published site.

- It is a description of the published record. The record follows where people have surveyed and what got catalogued.
- It is not a map of undiscovered sites. It cannot find one, and nothing in it is a candidate.
- A cell is 0.25°, about 28 km at the equator. That is far too coarse to point at a place.
- It carries no coordinates, no per-cell table, and no list of "top cells". The export drops any coordinate key (`pipeline/report.py: public_payload`), and `tests/test_suitability.py` checks the files.
- The wording in the interface is "tend to be recorded". It is never "predicted sites".

The honest summary of the current run: **3 of 10 layers beat a baseline that only knows survey effort. The other 7 are, within noise, survey-effort maps. 84% of land cells are "no basis". Nothing transfers between continents.**

## Grid

720 × 1440 cells of 0.25°. Row 0 touches 90°N, column 0 touches 180°W (`grid.py`). A cell is land when at least 25% of its ETOPO heights are above sea level. Polders and the Caspian shore therefore count as sea.

## Covariates

Eight per cell (`covariates.py`), all built by `scripts/fetch_global_covariates.py`. Licences are in [`data-sources.md`](data-sources.md).

| Covariate | Source | How it is reduced to 0.25° |
| --- | --- | --- |
| elevation | ETOPO 2022, 60 arc-second surface | mean of the heights above sea level |
| slope | ETOPO 2022 | mean slope of those pixels, in degrees |
| relief | ETOPO 2022 | standard deviation of those heights |
| river distance | HydroSHEDS 30 arc-second flow accumulation | great-circle distance to the nearest cell holding a pixel with at least 10,000 upstream pixels |
| coast distance | the land mask | great-circle distance to the nearest non-land cell |
| absolute latitude | the grid | |
| temperature | CHELSA-TraCE21k `bio01` | one slice per period: 7500 BCE, 3500 BCE, 750 BCE |
| precipitation | CHELSA-TraCE21k `bio12` | the same slices |

The undated "all" period uses the mean of the three climate slices. Each climate cell is the mean of the 30 pixels along its centre row only, because the remote files have one-row strips and no overviews. CHELSA stops at 84°N.

Rivers and coasts are present-day. The river mask includes dry desert channels with a large upstream area. Climate is a model reconstruction, not a measurement. None of this sees buried or drowned landscapes.

## Labels

`labels.py` reads `data/world/sources/*.jsonl` and keeps Wikidata and Pleiades records. OpenStreetMap is left out, as everywhere else in the atlas. These are the source records before the merge, so radiocarbon and curated dates are not used here.

| Class | Site types |
| --- | --- |
| monument | megalith, monumental, geoglyph, enclosure, ritual |
| settlement | settlement, tell, city |
| funerary | tumulus, necropolis |
| any | every type |

| Period | Years |
| --- | --- |
| early-holocene | 10,000–5000 BCE |
| mid-holocene | 5000–2000 BCE |
| late-holocene | 2000 BCE–500 CE |
| all | any, including undated |

A site counts for a period when its dated span overlaps it. Undated sites count only for "all". A cell is a presence when it holds at least one such site, so a cell with 500 barrows and a cell with one weigh the same.

## Target-group background

A presence-only model needs something to compare presences with. Comparing them with all land would mostly rediscover where archaeologists work. So the contrast set is the **documented cells**: every land cell that holds any published site of any kind (`background.py`, after Phillips et al. 2009). Both sides of the comparison were looked at by someone, which holds survey effort roughly constant. It reduces the bias. It does not remove it.

The current sources give 14,748 documented land cells. That is also why `any_all` cannot exist: every documented cell is a presence and nothing is left to compare with.

## Models

Two models are fitted for each layer (`model.py`), and the one with the higher held-out AUC is kept:

- logistic regression on standardised linear and squared terms, with balanced class weights
- gradient boosting (`HistGradientBoostingClassifier`, depth 3, 40 iterations)

In the current run boosting won eight layers, and logistic regression won `any_early-holocene` and `settlement_mid-holocene`.

## Block cross-validation

Neighbouring cells look alike, so a random split would flatter the model. Cells are grouped into 5° blocks, and whole blocks are assigned to five folds (`folds.py`, after Roberts et al. 2017). Every score in the metrics table comes from a model that never saw that cell's block.

A second test asks about transfer. The model is fitted without a whole macro-region (Americas, Europe and Anatolia, Africa and Near East, Asia, Oceania) and scored on it. A region is reported when it has at least 20 presences. The regions are coarse longitude and latitude boxes.

## The effort-only null

A layer has to beat a model that knows nothing about the ground. The null is a logistic regression on two inputs: the smoothed log density of all published sites, and absolute latitude (`model.py: effort_stack`). The density includes the held-out cells themselves, which favours the null. That is the safe direction.

The verdict in the caveat text uses a margin of 0.02 AUC, because fold-to-fold AUC varies by more than that (`caveats.py`):

- AUC at least 0.02 above the null: "terrain and climate add something beyond survey effort"
- within 0.02: a tie, "essentially a survey-effort map"
- more than 0.02 below: "does NOT beat the effort-only null"

## The two "no basis" rules

A land cell gets no score, and the value 255, when either holds (`envelope.py`):

1. **Outside the covariate envelope.** Any covariate is below the 1st or above the 99th percentile of the documented cells the model was fitted on.
2. **Not locally documented.** Fewer than 10 documented cells lie in the 21 × 21 cell window around it, about 2.5° in each direction. The fitted pattern does not carry between continents, so matching conditions far from any documented cell are not a basis for a score.

In the shipped layers 84% of land cells are "no basis" (77% of land area, since high-latitude cells are small). Most of Africa, Asia, the Americas and Oceania are grey.

## Deciles

Scored cells are ranked against the final scores of the documented cells (`export.py: decile_raster`). Value 10 means "scores like the top tenth of documented cells". The raw scores are not published.

## Metrics of the current run

From `Anatolia/atlas/public/predict/index.json`, generated 2026-11-17. All held out on 5° blocks, five folds.

| Layer | Presence cells | Boyce | Gain, top 10% | Gain, top 20% | AUC | Effort-null AUC | Against the null | Left-out region AUC |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `any_early-holocene` | 515 | 0.945 | 0.408 | 0.523 | 0.711 | 0.754 | does not beat it | 0.51 to 0.59 |
| `any_mid-holocene` | 1,252 | 0.771 | 0.649 | 0.585 | 0.726 | 0.638 | **beats it** | 0.60 to 0.68 |
| `any_late-holocene` | 7,305 | 0.994 | 0.417 | 0.386 | 0.811 | 0.794 | tie | 0.43 to 0.74 |
| `settlement_mid-holocene` | 449 | 0.965 | 0.714 | 0.685 | 0.817 | 0.812 | tie | 0.43 to 0.66 |
| `settlement_late-holocene` | 5,501 | 0.995 | 0.540 | 0.487 | 0.831 | 0.828 | tie | 0.43 to 0.78 |
| `settlement_all` | 6,572 | 0.998 | 0.473 | 0.439 | 0.812 | 0.816 | tie | 0.44 to 0.72 |
| `monument_late-holocene` | 2,403 | 0.807 | 0.560 | 0.500 | 0.756 | 0.764 | tie | 0.50 to 0.62 |
| `monument_all` | 5,705 | 0.978 | 0.611 | 0.522 | 0.775 | 0.772 | tie | 0.53 to 0.57 |
| `funerary_late-holocene` | 1,012 | 0.161 | 0.680 | 0.574 | 0.728 | 0.572 | **beats it** | 0.50 to 0.60 |
| `funerary_all` | 3,005 | 0.910 | 0.708 | 0.622 | 0.771 | 0.726 | **beats it** | 0.48 to 0.79 |

How to read the columns:

- **Boyce** (Hirzel et al. 2006): does the share of presences rise steadily with the score? +1 is ideal, 0 is random, negative means the ranking is the wrong way round.
- **Gain** (Kvamme 1988): `1 − area share ÷ presence share` for the top-scoring 10% or 20% of documented area. 0 is chance. 0.5 means that area holds twice its share of held-out presences.
- **AUC**: the chance that a random presence cell outscores a random documented cell without one. 0.5 is chance. Compare it with the effort-null AUC beside it, not with 0.5.

`funerary_late-holocene` beats the null on AUC, but its Boyce index of 0.16 says the scores are barely ordered. Treat it as weak.

The left-out region column is the real limit. With a whole macro-region held out, AUC sits near 0.5 somewhere in every layer. The pattern is regional.

## Skipped layers

Sixteen combinations were tried. Six are not published, and `index.json` lists them under `skipped` with the reason.

| Layer | Reason |
| --- | --- |
| `monument_early-holocene` | too few cells: 113 presence cells, and the minimum is 200 |
| `funerary_early-holocene` | too few cells: 40 presence cells |
| `settlement_early-holocene` | no held-out skill: AUC 0.84 but Boyce −0.53 |
| `monument_mid-holocene` | no held-out skill: AUC 0.73, Boyce −0.60 |
| `funerary_mid-holocene` | no held-out skill: AUC 0.78, Boyce −0.12 |
| `any_all` | no contrast cells: every documented cell is a presence |

A layer with AUC at or below 0.5, or Boyce at or below 0, is dropped. It is not published with an apology (`__main__.py: no_skill_reason`).

## Known artefacts and biases

- **East–west stripes.** Straight steps in the colours along lines of latitude come from using absolute latitude as a covariate, mostly in the boosted models. They are not features of the ground.
- **Dated layers follow Pleiades.** Most sites are undated, and most dated ones come from the Pleiades gazetteer of the Mediterranean and Near East. The period layers partly show where that gazetteer reaches.
- **Europe dominates.** About 90% of the Wikidata records are in Europe. See [`world-catalogue.md`](world-catalogue.md).
- **One presence per cell.** Density inside a cell is ignored.
- **Type "other".** About 18% of the Wikidata source records have no usable type and count only for the "any" class.

## Files

`public/predict/<class>_<period>.png` is a 1440 × 720 8-bit greyscale image, equirectangular, row 0 at 90°N and column 0 at 180°W. Values: 0 ocean, 1–10 decile, 255 no basis.

`public/predict/index.json`:

```
{"generated", "cellDegrees": 0.25,
 "layers": [{"id", "file", "title", "siteClass", "period", "presences",
             "metrics": {"boyce", "gainTop10", "gainTop20", "auc", "effortNullAuc", "folds"},
             "caveats": ["…"]}],
 "skipped": [{"id", "reason"}],
 "legend": {"0", "1-10", "255"},
 "licences": [{"name", "licence", "attribution"}]}
```

The caveat list is written by `caveats.py` from the numbers. The interface must show it with the layer.

## Rerun

```bash
python scripts/fetch_global_covariates.py     # once; about 670 MB of downloads, cached
python -m ai_archaeology.suitability           # about 2.5 minutes; rewrites public/predict/
pytest tests/test_suitability.py               # synthetic data only
```

The first command downloads real data. Do not run it unless the owner of the repository asked for that download. `python -m ai_archaeology.suitability` takes `--sources`, `--covariates` and `--out`. Run it after the source records change. The run prints the pooled value and the fold range of every metric, the chosen model, and the left-out region AUCs.

## What would make it better

1. **More inventories outside Europe.** The background is only as wide as the published record. The candidates are listed in [`world-catalogue.md`](world-catalogue.md).
2. **True survey-coverage polygons.** The target-group background is a stand-in for knowing where people looked and found nothing. Real survey footprints would give real absences.
3. **Regional lidar detectors where open bare-earth lidar exists.** That is a different tool at a different scale: metres, not 28 km. Its outputs would be candidates, and candidate locations stay private under `data/` and `outputs/`. They are never committed and never drawn on the public globe. See [`cross-region-pipeline.md`](cross-region-pipeline.md).
4. A proper coastline and palaeo-shoreline mask, and whole-cell climate means instead of centre rows.
