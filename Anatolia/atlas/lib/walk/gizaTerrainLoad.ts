/** Loads the prebuilt Giza ground. The browser only; the pure maths is gizaTerrain.ts. */

import { decodeGizaHeight, readGizaTerrainRecord, type GizaTerrain } from "./gizaTerrain";

const RECORD_URL = "/walk/giza/terrain.json";
const HEIGHT_URL = "/walk/giza/height.u16";

export async function loadGizaTerrain(): Promise<GizaTerrain> {
  const [recordResponse, heightResponse] = await Promise.all([fetch(RECORD_URL), fetch(HEIGHT_URL)]);
  if (!recordResponse.ok || !heightResponse.ok) throw new Error("Giza ground did not load");
  const record = readGizaTerrainRecord(await recordResponse.json());
  const metres = decodeGizaHeight(await heightResponse.arrayBuffer(), record);
  return { ...record, metres };
}
