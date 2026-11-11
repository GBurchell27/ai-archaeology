# Scripts

The Şanlıurfa terrain build lives at `Anatolia/explorer/scripts/build_web_assets.py`. It reads public COGs and writes small viewer files under `Anatolia/explorer/public/terrain/`. It does not commit raw rasters.

Download scripts belong here. Commit the script, not the file it downloads.

A script should record the dataset name, the date it was fetched, the URL or service, and the licence. It should write into `data/` and stop there. It must not write coordinates of candidate or undiscovered sites into the repository.
