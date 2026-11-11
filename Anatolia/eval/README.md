# Blind mound recall

This checks whether a terrain detector can find the published places already in the atlas. It does not look for new sites, and a hit is not a discovery.

The search area is the union of regional windows around those places, each padded so the window is at least about 30 km across. Regions are held out one at a time. The score is chosen only on the other regions, under a cap of 15 candidates per 100 km². Blobs are still 80–600 m across and 3–40 m high. They are ranked by a tell score (roundness, a flat top with steeper flanks, isolation on a quiet plain, and penalties for rugged ground and long ridges) instead of raw Laplacian strength. `baseline.json` is the earlier Laplacian ranking. Copernicus DEM GLO-30 is read for the run and is not committed. `figures/` shows three published tells only. `wikidata-recall.json` scores the separate Wikidata snapshot against those same candidates. Those labels were not used to choose the score, and places outside the regional windows are not counted.

Places tagged `mound` are tells, tumuli, or compact hills. Places tagged `urban` are cities, castles, battles, flooded ground, or rock-cut landscapes. Those are not expected to show as a 3–40 m mound at 30 m resolution.

`sites.md` and `metrics.json` name only published places. Candidate coordinates, if the run writes them, stay in `outputs/eval/`, which is gitignored.

Run from the repository root:

```bash
.venv/bin/python -m ai_archaeology.eval
```
