# Cross-region training

This is a learning pipeline. It standardises public terrain, trains on published monuments in Ireland and the United States, and checks recall on published atlas sites in Turkey. A hit is not a discovery. An archaeologist confirms a site. The code does not see through rock or sediment.

Raw rasters and inventory points stay under `data/`, which is gitignored. Shareable figures, if drawn, move any point by at least 5 km.

## Standardised raster

Each source becomes a Cloud Optimised GeoTIFF in the local UTM zone:

- float32 elevations in metres
- explicit nodata `-9999`
- vertical datum recorded in the sidecar, not silently converted
- bare-earth flag: true for a DTM, false for a DSM such as Copernicus GLO-30
- resolution ladder of 1, 5, 10 and 30 m, keeping only rungs the source can support
- coarsening uses average resampling; an unchanged rung uses bilinear
- a rung more than about 5% finer than the delivered pixel is refused

Relief layers, from `ai_archaeology.relief`, are hillshade, multi-directional hillshade, slope, local relief, and sky-view factor. They are pictures of the surface.

The sidecar schema is `src/ai_archaeology/ingest/terrain_metadata.schema.json`. It requires source, licence, attribution, acquisition date, native resolution, vertical datum, CRS, processing steps and versions, a SHA-256 checksum, and the bare-earth flag.

## Region registry

`regions/*.yaml` names a study window, a dataset adapter, a published inventory, feature classes with a typical diameter, and the validation split.

| Region | Role | Terrain | Inventory |
| --- | --- | --- | --- |
| `ireland_roscommon` | source | one GSI Phase 2 DTM tile, CC BY 4.0 | National Monuments Service SMR, CC BY 4.0 |
| `united_states_cahokia` | source | USGS 3DEP, public domain | one unrestricted National Register polygon |
| `turkey_tektek` | transfer target | Copernicus DEM GLO-30 | two published atlas neolithic ids |

The Ireland window is an open-data tile id. The US window is a buffer around a named public listing. The Turkey window is a buffer around atlas feature ids that are already in the atlas. Monument coordinates are fetched at run time into `data/` and are not written into the registry.

Spatial blocks are a grid. The eastern column, plus a buffer, is the frozen test set. A training patch is refused unless its whole window, widened by the relief-kernel radius, stays outside that strip. The same footprint rule applies to a held-out cross-validation fold. Training relief is rebuilt with those cells masked, so they never enter the kernels or the nodata fill. Turkey is excluded from training by its role.

## What 30 m can show

Training for the transfer check uses the 30 m rung, because that is Turkey's posting.

- Ringforts (about 25–60 m) and barrows are unresolved at 30 m.
- Ordinary enclosures are marginal.
- Large enclosures, hillforts, and a platform-mound complex can remain as broad relief.
- The Turkey labels are published Taş Tepeler sites. Their enclosures are mostly 10–30 m. They are not classic höyüks.

A weak transfer score is the expected result. It is not evidence that a place is empty, and it is not a new site.

## Run

```bash
python scripts/run_cross_region_smoke.py
```

The script downloads the three small windows, writes standardised COGs and relief stacks, fits a small CPU CNN and a gradient-boosting baseline, and writes `outputs/cross_region/report.json`. Review decisions, when a person has made them, are read from `~/.ai-archaeology/reviews.sqlite`. Rejected rows with a reason code can become hard negatives. That database is outside git.

Netherlands AHN, Denmark DHM, England Environment Agency lidar, Slovenia, and INEGI have adapter descriptions. This run does not download them. Slovenia and INEGI stay closed until their licences are read from the publisher.
