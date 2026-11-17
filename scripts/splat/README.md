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

   This writes `data/splat/gobekli-tepe/images/` and `credits.json`. Delete photographs of finds, signs, people and the museum before the next step.

2. **Camera positions.** The command line of this COLMAP build has not been run on this machine yet: check the option names with `colmap.exe automatic_reconstructor -h`.

   ```bash
   data/splat/tools/colmap/bin/colmap.exe automatic_reconstructor --workspace_path data/splat/gobekli-tepe --image_path data/splat/gobekli-tepe/images --dense 0 --use_gpu 0
   ```

   It writes `data/splat/gobekli-tepe/sparse/0/`. Read how many photographs it registered. If it is a small share of them, the photographs do not overlap enough and no later step will rescue that.

3. **Training.** Start `data/splat/tools/brush/brush_app.exe`, load the folder `data/splat/gobekli-tepe`, let it train, and export a `.ply` to `data/splat/gobekli-tepe/export.ply`. Brush also has a command line (`brush_app.exe --help`).

4. **Convert and publish locally.**

   ```bash
   .venv/Scripts/python scripts/splat/ply_to_splat.py data/splat/gobekli-tepe/export.ply Anatolia/atlas/public/splats/gobekli-tepe.splat
   cp data/splat/gobekli-tepe/credits.json Anatolia/atlas/public/splats/gobekli-tepe.credits.json
   ```

5. **Align.** Open `/?view=walk&site=gobekli-tepe`. Structure from motion has no real scale and no level floor, so set `alignment` for the site in `walkSites.ts` until the floor is flat at your feet and a pillar is the right height.

## Checks

```bash
.venv/Scripts/python scripts/splat/ply_to_splat.py --self-check
node --experimental-strip-types Anatolia/atlas/scripts/check_walk.mts
```
