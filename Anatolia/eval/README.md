# Blind mound recall

This checks whether a terrain detector can find the published places already in the atlas. It does not look for new sites, and a hit is not a discovery.

The search area is the union of regional windows around those places, each padded so the window is at least about 30 km across. Regions are held out one at a time. Thresholds are chosen only on the other regions, under a cap of 15 candidates per 100 km². The detector is residual relief plus a multi-scale Laplacian of Gaussian for blobs about 80–600 m across and 3–40 m high, with a slope and elongation gate. Copernicus DEM GLO-30 is read for the run and is not committed.

Places tagged `mound` are tells, tumuli, or compact hills. Places tagged `urban` are cities, castles, battles, flooded ground, or rock-cut landscapes. Those are not expected to show as a 3–40 m mound at 30 m resolution.

`sites.md` and `metrics.json` name only published places. Candidate coordinates, if the run writes them, stay in `outputs/eval/`, which is gitignored.

Run from the repository root:

```bash
.venv/bin/python -m ai_archaeology.eval
```
