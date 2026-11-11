# AI archaeology

A private hobby pipeline for learning how ancient structures can show up in public terrain and satellite data, and how to check those hints against published records before a person takes them seriously.

This is a learning and research project. It is not a product, not a survey, and not a way to declare new sites.

## Honest scope

The first region is a **known-site validation area**: Şanlıurfa province in southeastern Anatolia (Upper Mesopotamia), and the published Taş Tepeler Neolithic sites, including Göbekli Tepe and Karahan Tepe. The point of that region is to see whether the pipeline notices monuments that archaeologists already published, and to see how often it is wrong. It is not a blank-map search.

The Anatolia data-gathering notes are in [`Anatolia/`](Anatolia/README.md). Later regions may include the Maya lowlands (INEGI LiDAR) and Irish or other European LiDAR. No dataset is in use until its licence is written down in [`docs/data-sources.md`](docs/data-sources.md), which points at the Anatolia register.

What is implemented now is relief visualisation from a DEM. Detection, the literature check, ranking, and the private review map are the rest of the pipeline and are not built yet.

Nothing in this repository is a discovery.

## Pipeline

```
terrain / imagery
    -> relief visualisations
    -> detection
    -> literature check, with an audit trail
    -> ranked candidates
    -> human review
```

1. **Terrain and imagery.** Public DEMs, LiDAR, and satellite scenes, each used under its own licence.
2. **Relief visualisations.** Hillshade, multi-directional hillshade, slope, local relief, and sky-view factor, so a person can see low mounds and ditches that a plain elevation raster hides.
3. **Detection.** A later step. It would propose candidates. It would not confirm them.
4. **Literature check, with an audit trail.** Compare a candidate with published surveys and site records. Keep the citation, the dataset version, and the date, so a later reader can see why it was kept or dropped.
5. **Ranked candidates.** Order the leftovers by how strongly the terrain hint and the literature check agree. Rank is a sorting aid.
6. **Human review.** A private map for a person to accept, reject, or send to an archaeologist. A candidate stays a candidate until an archaeologist confirms it.

## Ethics

These are hard rules:

- **Never commit precise coordinates of candidate or undiscovered sites.** Looting is the reason. This includes commits, issues, figures, filenames, and documentation.
- **Shareable outputs use coarse or jittered locations.** A public note can name a province or a published site. It does not pin an unconfirmed place.
- **A candidate is never called a discovery** unless an archaeologist confirms it. The code and the write-ups use "candidate".
- **Respect each dataset's licence.** Record dataset, resolution, coverage, licence, access, and notes in `docs/data-sources.md` before use. Do not redistribute a file the licence does not allow.
- **Do not overclaim what the sensors see.** Optical imagery, radar, and DEMs cannot see through rock or deep sediment. A mound in a hillshade is a surface shape. It is not a buried building, and it is not a date.

Published coordinates of already protected, already famous sites are not an invitation to copy those coordinates into new files here. The validation area is named above. The literature already holds the site records.

## Layout

```
src/ai_archaeology/    Python package
scripts/               download scripts (the scripts, not the data)
Anatolia/              SE Anatolia notes, source register, and terrain explorer
docs/data-sources.md   pointer to regional registers, plus a blank template
data/                  gitignored local rasters
outputs/               gitignored local products
```

## Requirements

- Python 3.11+
- GDAL, which rasterio needs. Wheels from PyPI bundle a matching GDAL, so `pip install` is enough on a machine that can use those wheels. Building rasterio from source needs the GDAL development libraries installed first.

Torch is an optional extra for a later detection step. This slice does not import it.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
pytest
```

Optional, unused here: `pip install -e ".[torch]"`.

## Relief visualisations

Elevations and pixel size must share a unit, normally metres. Reproject a geographic (degree) DEM to a metre CRS first. The CLI warns if the CRS is geographic, and it still writes the files.

`python -m ai_archaeology.relief` reads band 1 of a GeoTIFF and writes, into `--out-dir`:

| File | What it is |
| --- | --- |
| `hillshade.tif` | Lambert cosine shade, 0 (shadow) to 1 (full light). Light azimuth defaults to 315°, altitude to 45°. Central differences, so it is close to `gdaldem hillshade` and not pixel-identical. |
| `multidirectional_hillshade.tif` | Mean of hillshades at equally spaced azimuths (default 8). |
| `slope.tif` | Slope magnitude in degrees. |
| `local_relief.tif` | DEM minus a circular mean of `--relief-radius`. Positive is locally high. This is the simple residual, not Hesse's full local-relief model. |
| `sky_view_factor.tif` | Fraction of the sky visible, 0 to 1, from a horizon search of `--svf-radius` over `--svf-directions` bearings. `1 - mean(sin horizon angle)`, after Zakšek, Oštir, and Kokalj (2011), with no vertical exaggeration. |

Each GeoTIFF keeps the source CRS and transform, which is what QGIS and other GIS software use to place a raster. A PNG next to it is only a preview and is not georeferenced.

```bash
python -m ai_archaeology.relief path/to/dem.tif --out-dir outputs/relief
```

Useful knobs: `--azimuth`, `--altitude`, `--multi-directions`, `--relief-radius`, `--svf-radius`, `--svf-directions`.

From Python:

```python
from ai_archaeology.relief import hillshade, local_relief, sky_view_factor
```

## Tests

`pytest` builds synthetic DEMs in memory: a flat plane, ramps with a known slope, and a circular mound inside a ring ditch. It checks value ranges, that the mound and ditch separate cleanly in local relief, that the ditch darkens in sky-view factor, and that written GeoTIFFs keep the CRS and transform. The test grids use an arbitrary origin. They are not placed on a real site.

## What this does not do

- It does not download elevation, LiDAR, or satellite scenes.
- It does not detect sites, search the literature, rank candidates, or draw a review map.
- It does not see underground. A smooth field can hide archaeology, and a bump can be a spoil heap, a road, or noise.
