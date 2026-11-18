# Gaussian splats for the walk view

These steps turn photographs of a published, excavated site into a splat that `/?view=walk&site=<id>` in the atlas can walk through. Everything they download or build stays under `data/splat/` and `Anatolia/atlas/public/splats/`, both gitignored. The photographs are mostly CC BY-SA, so the splat built from them is share-alike too: keep it local, and keep the credits file beside it.

A splat is only as good as its photographs. Visitors' photographs come from many cameras, years and excavation states, and mostly from the walkways. Expect holes and smears wherever nobody stood. It is a picture of the photographs, not a survey.

## Tools

Neither tool is installed by a script. Unpack each into `data/splat/tools/`.

| Tool | What it does | Where |
| --- | --- | --- |
| COLMAP 4.2.1, `colmap-x64-windows-nocuda.zip` | Works out where each photograph was taken (structure from motion). | `https://github.com/colmap/colmap/releases` |
| Brush 0.3.0, `brush-app-x86_64-pc-windows-msvc.zip` | Trains the splat. Runs on Intel, AMD and Nvidia GPUs. | `https://github.com/ArthurBrussee/brush/releases` |

## Steps

Run from the repository root. `gobekli-tepe` stands for the site id in `Anatolia/atlas/lib/walk/walkSites.ts`.

1. **Photographs.** Name each Commons category you want. Subcategories are not followed, so museum replicas and finds stay out unless you ask for them.

   ```bash
   .venv/Scripts/python scripts/splat/fetch_commons_photos.py gobekli-tepe "Göbekli Tepe" "Göbekli Tepe excavations in 2012"
   ```

   Wikimedia refuses most image downloads (HTTP 429) from a client that gives no contact. Set `COMMONS_USER_AGENT` first, for example `ai-archaeology-atlas/0.1 (you@example.org)`. A rerun skips photographs already on disk.

   This writes `data/splat/gobekli-tepe/images/` and `credits.json`. Delete photographs of finds, signs, people and the museum before the next step, and stitched panoramas, which no camera model fits.

2. **Camera positions.** This build has no GPU support, hence `--use_gpu 0`. `--data_type internet` is the setting for photographs from many cameras.

   ```bash
   data/splat/tools/colmap/bin/colmap.exe automatic_reconstructor --workspace_path data/splat/gobekli-tepe --image_path data/splat/gobekli-tepe/images --data_type internet --dense 0 --use_gpu 0
   ```

   On a laptop short of memory, run the stages one at a time with a thread cap instead: `feature_extractor`, `exhaustive_matcher`, then `mapper`, each with its `num_threads 4` and `use_gpu 0` options. A stopped matcher carries on where it left off. For Göbekli Tepe, 294 photographs took about three hours and 73 registered; 32 photographs of one enclosure alone did not link at all.

   It writes `data/splat/gobekli-tepe/sparse/0/`. Read how many photographs it registered. If it is a small share of them, the photographs do not overlap enough and no later step will rescue that.

3. **Undistort.** Do not train on the folder from step 2. Brush takes the first `cameras.bin` it finds, and COLMAP often writes several models (`sparse/0`, `sparse/1`, ...) in unrelated coordinate frames, so cameras and starting points can come from different models. Brush also ignores lens distortion, which COLMAP estimates for every photograph. This step writes one model, the largest, with distortion-free photographs:

   ```bash
   data/splat/tools/colmap/bin/colmap.exe image_undistorter --image_path data/splat/gobekli-tepe/images --input_path data/splat/gobekli-tepe/sparse/0 --output_path data/splat/gobekli-tepe/undistorted --output_type COLMAP --max_image_size 1600
   ```

4. **Training.** Add `--with-viewer` to watch it train. 15,000 steps on 73 photographs took about half an hour on an Intel Arc 140V. Brush 0.3.0 sometimes panics at startup with `min > max`; run it again. `--sh-degree 0` matters: the `.splat` format holds one colour per splat, so colour that training puts in the higher bands is lost on conversion. `--max-splats` and `--growth-stop-iter` keep the file small enough for a laptop GPU and leave the last steps to settle the splats.

   ```bash
   data/splat/tools/brush/brush_app.exe data/splat/gobekli-tepe/undistorted --total-steps 15000 --max-resolution 1280 --sh-degree 0 --max-splats 600000 --growth-stop-iter 10000 --export-path data/splat/gobekli-tepe/brush_undistorted
   ```

5. **Convert and publish locally.**

   ```bash
   .venv/Scripts/python scripts/splat/ply_to_splat.py data/splat/gobekli-tepe/brush_undistorted/export_15000.ply Anatolia/atlas/public/splats/gobekli-tepe.splat
   cp data/splat/gobekli-tepe/credits.json Anatolia/atlas/public/splats/gobekli-tepe.credits.json
   ```

6. **Align.** Open `/?view=walk&site=gobekli-tepe`. Structure from motion has no real scale and no level floor, so set `alignment` for the site in `walkSites.ts` until the floor is flat at your feet and a pillar is the right height.

## Checks

```bash
.venv/Scripts/python scripts/splat/ply_to_splat.py --self-check
node --experimental-strip-types Anatolia/atlas/scripts/check_walk.mts
```
