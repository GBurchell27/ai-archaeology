# Scripts

The Şanlıurfa terrain build lives at `Anatolia/explorer/scripts/build_web_assets.py`. It reads public COGs and writes small viewer files under `Anatolia/explorer/public/terrain/`. It does not commit raw rasters.

Download scripts belong here. Commit the script, not the file it downloads.

`scripts/run_cross_region_smoke.py` fetches one Irish LiDAR tile, one USGS 3DEP window, and one Copernicus GLO-30 window into `data/cross_region/`. It also reads the National Monuments Service SMR and one public National Register polygon. Those points stay under `data/`.

A script should record the dataset name, the date it was fetched, the URL or service, and the licence. It should write into `data/` and stop there. It must not write coordinates of candidate or undiscovered sites into the repository.
