# Gaussian splats for the walk view

These steps turn photographs of a published, excavated site into a splat that `/?view=walk&site=<id>` in the atlas can walk through. The photographs, COLMAP models and training files stay under `data/splat/`, which is gitignored. The finished splat and its credits file go in `Anatolia/atlas/public/splats/` and are committed. The photographs are mostly CC BY-SA, so the splat built from them is share-alike too: it is published under CC BY-SA 4.0, and its credits file must name every photograph it was trained on (see `Anatolia/atlas/public/splats/README.md`).

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
   ```

   Training also leaves splats where no photograph looked: long pale streaks around the edge of the site and behind the photographers. They barely show from the photographed side and fill the screen from every other. The converter can drop the splats that lie far from every structure-from-motion point, which are the ones nothing in the photographs pins down. It is off unless asked for. It needs the COLMAP model that was trained on, as text:

   ```bash
   data/splat/tools/colmap/bin/colmap.exe model_converter --input_path data/splat/gobekli-tepe/undistorted/sparse --output_path data/splat/gobekli-tepe/sparse_txt --output_type TXT
   .venv/Scripts/python scripts/splat/ply_to_splat.py data/splat/gobekli-tepe/brush_undistorted/export_15000.ply Anatolia/atlas/public/splats/gobekli-tepe.splat --evidence-points data/splat/gobekli-tepe/sparse_txt/points3D.txt --max-evidence-distance 0.3
   ```

   The distance is in the model's own units, not metres: multiply by the `scale` of the site's alignment (step 6) to read it in metres. For Göbekli Tepe 0.3 is about 1.65 m and drops 2.4% of the splats that would be drawn (20,951 of 871,941); 0.5 leaves more streaks and 1.0 most of them. The cull takes real things too when they are smooth and far from the stones, because structure from motion matches nothing on them: here the far side of the shelter roof went with the streaks. Write to a new file name first, compare both in the walk from several directions, and keep the uncut file.

   The credits file should name the photographs the splat was trained on, not every photograph fetched. This keeps the rows whose file is in the training folder:

   ```bash
   .venv/Scripts/python -c "import json,os,sys; c=json.load(open(sys.argv[1],encoding='utf-8')); used=set(os.listdir(sys.argv[2])); c['photographs']=[p for p in c['photographs'] if p['file'] in used]; json.dump(c,open(sys.argv[3],'w',encoding='utf-8'),ensure_ascii=False,indent=1); print(len(c['photographs']),'photographs credited')" data/splat/gobekli-tepe/credits.json data/splat/gobekli-tepe/undistorted/images Anatolia/atlas/public/splats/gobekli-tepe.credits.json
   ```

6. **Align.** Open `/?view=walk&site=gobekli-tepe`. Structure from motion has no real scale and no level floor, so set `alignment` for the site in `walkSites.ts` until the floor is flat at your feet and a pillar is the right height.

## Checks

```bash
.venv/Scripts/python scripts/splat/ply_to_splat.py --self-check
node --experimental-strip-types Anatolia/atlas/scripts/check_walk.mts
```
