// Downloads the CC0 vehicle models used by the trip replay into public/models/trip/, and copies
// three's KTX2 (Basis) transcoder into public/basis/, which the models' textures need.
// Run from Anatolia/atlas: node scripts/fetch_trip_models.mjs
import { copyFile, mkdir, writeFile } from "node:fs/promises";

const MODELS = [
  { file: "airliner.glb", url: "https://tevy.dev/models/narrowbody-airliner/v1/lod2.glb" },
  { file: "suv.glb", url: "https://tevy.dev/models/suv/v1/lod1.glb" },
];

const folder = new URL("../public/models/trip/", import.meta.url);
await mkdir(folder, { recursive: true });
for (const model of MODELS) {
  const response = await fetch(model.url);
  if (!response.ok) throw new Error(`${model.url}: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (new TextDecoder().decode(bytes.subarray(0, 4)) !== "glTF") throw new Error(`${model.url}: not a GLB`);
  await writeFile(new URL(model.file, folder), bytes);
  console.log(`${model.file}: ${bytes.length} bytes`);
}

const transcoderSource = new URL("../node_modules/three/examples/jsm/libs/basis/", import.meta.url);
const transcoderTarget = new URL("../public/basis/", import.meta.url);
await mkdir(transcoderTarget, { recursive: true });
for (const file of ["basis_transcoder.js", "basis_transcoder.wasm"]) {
  await copyFile(new URL(file, transcoderSource), new URL(file, transcoderTarget));
  console.log(`basis/${file}: copied`);
}
