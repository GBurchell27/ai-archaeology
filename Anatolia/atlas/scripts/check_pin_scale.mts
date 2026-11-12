import { readFileSync } from "node:fs";
import { buildTerrainGeometry, coarseSampleIndexes, coarseTerrainGeometry, decimateGrid, sliceTerrainTiles } from "../lib/terrain.ts";
import {
  approachDistance,
  clusterByScreen,
  clusterSignature,
  lookPoseArgument,
  worldSizeForPixels,
  type ScreenPin,
} from "../lib/pinCluster.ts";
import {
  dprForIndex,
  initialQuality,
  initialTerrainCoarse,
  nextBeyondOffMs,
  nextQuality,
  nextTerrainCoarse,
  tileReleaseDue,
} from "../lib/renderQuality.ts";

let failed = 0;

function check(label: string, condition: boolean): void {
  if (condition) return;
  failed += 1;
  console.error("FAIL", label);
}

function pin(id: string, screenX: number, screenY: number, visible = true): ScreenPin {
  return {
    id,
    name: id,
    x: screenX * 10,
    y: 0,
    z: screenY * 10,
    longitude: 0,
    latitude: 0,
    screenX,
    screenY,
    visible,
  };
}

const clustered = clusterByScreen([
  pin("a", 10, 10),
  pin("b", 40, 20),
  pin("c", 200, 200),
  pin("hidden", 12, 12, false),
], 68);
check("two nearby pins share a cluster", clustered.length === 2);
check("the near cell counts both pins", clustered[0].count === 2);
check("ids stay with the cluster", clustered[0].ids.join(",") === "a,b");
check("a lone pin is not a group", clustered[1].count === 1 && clustered[1].name === "c");
check("hidden pins are left out", !clustered.some((cluster) => cluster.ids.includes("hidden")));
check("signature is stable", clusterSignature(clustered) === clusterSignature(clustered));
check("zero cell size is rejected", (() => {
  try {
    clusterByScreen([], 0);
    return false;
  } catch {
    return true;
  }
})());

check("a wide cluster still steps closer", approachDistance(80000, 40000, 38) < 80000);
check("a tight cluster fits inside the view", approachDistance(80000, 4000, 38) < 20000);
check("approach never goes past the floor", approachDistance(8000, 100, 38) >= 7000);
check("approach does not zoom back out", approachDistance(7000, 100, 38) === 7000);
check("screen size grows with distance", worldSizeForPixels(2000, 38, 900, 16) > worldSizeForPixels(1000, 38, 900, 16));
check("look pose argument keeps the camera distance", Math.abs(lookPoseArgument(10000) * Math.hypot(0.16, 0.34, 0.63) - 10000) < 1);

const slow = nextQuality(initialQuality(), 40);
check("slow frames step the buffer down", slow.dprIndex === initialQuality().dprIndex + 1);
check("gamma stays until the floor", slow.fastShade === false);
const floor = { dprIndex: 3, fastShade: false };
const shaded = nextQuality(floor, 40);
check("the floor skips gamma instead of going further", shaded.fastShade && shaded.dprIndex === 3);
const restored = nextQuality(shaded, 10);
check("fast frames restore gamma before resolution", restored.fastShade === false && restored.dprIndex === 3);
check("dpr index clamps", dprForIndex(99) === 0.4 && dprForIndex(-2) === 1);

check("the whole country stays one mesh", nextTerrainCoarse(false, 200000, 10, false));
check("a near view keeps tiles while frames are fine", nextTerrainCoarse(false, 50000, 40, false) === false);
check("a slow close-up still loads tiles", nextTerrainCoarse(false, 50000, 40, true) === false);
check("software rendering at 28 ms still sharpens a zoom", nextTerrainCoarse(true, 110000, 28, true) === false);
check("tiles turn on below 140 km", nextTerrainCoarse(true, 139000, 28, true) === false);
check("tiles stay on inside the 140 to 160 km band", nextTerrainCoarse(false, 150000, 8, false) === false);
check("coarse stays on inside the 140 to 160 km band", nextTerrainCoarse(true, 150000, 8, false) === true);
check("tiles turn off above 160 km", nextTerrainCoarse(false, 161000, 8, false) === true);
check("a session opening at 145 km starts on tiles", initialTerrainCoarse(145000) === false);
check("a session opening at 155 km starts coarse", initialTerrainCoarse(155000) === true);
check("hysteresis still holds tiles at 145 km", nextTerrainCoarse(false, 145000, 28, true) === false);
check("hysteresis still holds the coarse mesh at 155 km", nextTerrainCoarse(true, 155000, 8, false) === true);
check("the release clock resets inside the off distance", nextBeyondOffMs(150000, 9000, 1000) === 0);
check("the release clock accumulates beyond the off distance", nextBeyondOffMs(170000, 9000, 1000) === 10000);
check("tiles stay resident just under 10 s past the off distance", tileReleaseDue(170000, 9999) === false);
check("tiles are released after 10 s beyond the off distance", tileReleaseDue(170000, 10000) === true);
check("coming back inside cancels the release", tileReleaseDue(150000, 20000) === false);

const columns = coarseSampleIndexes(1700, 8);
const rows = coarseSampleIndexes(719, 8);
check("the coarse stride keeps the last source column", columns[columns.length - 1] === 1699 && columns.includes(1696));
check("the coarse stride keeps the last source row", rows[rows.length - 1] === 718 && rows.includes(712));
const exact = coarseSampleIndexes(9, 8);
check("a stride that already lands on the edge is not repeated", exact.length === 2 && exact[1] === 8);

const grid = {
  width: 4,
  height: 2,
  bounds: [0, 0, 40, 20] as [number, number, number, number],
  metres: Float32Array.from([0, 1, 2, 3, 4, 5, 6, 7]),
};
const reduced = decimateGrid(grid, 2);
check("decimate keeps the strided samples", reduced.width === 2 && reduced.height === 1);
check("decimate reads the source columns", reduced.metres[0] === 0 && reduced.metres[1] === 2);

const full = buildTerrainGeometry(grid, [0, 0], 0, 1);
const coarse = coarseTerrainGeometry(grid, [0, 0], 0, 1, 2);
const coarsePosition = coarse.getAttribute("position");
check("coarse samples stay on their source cells",
  coarsePosition.getX(0) === full.getAttribute("position").getX(0)
  && coarsePosition.getZ(0) === full.getAttribute("position").getZ(0)
  && coarsePosition.getX(1) === full.getAttribute("position").getX(2)
  && coarsePosition.getY(1) === full.getAttribute("position").getY(2));
const lastCoarse = coarsePosition.count - 1;
const lastFull = full.getAttribute("position").count - 1;
check("the coarse mesh keeps the east and south edges",
  coarsePosition.getX(lastCoarse) === full.getAttribute("position").getX(lastFull)
  && coarsePosition.getZ(lastCoarse) === full.getAttribute("position").getZ(lastFull)
  && coarsePosition.getY(lastCoarse) === full.getAttribute("position").getY(lastFull));
coarse.dispose();

const terrainView = readFileSync(new URL("../components/NationalTerrain.tsx", import.meta.url), "utf8");
check("the view releases tiles through the shared clock",
  terrainView.includes("tileReleaseDue(") && terrainView.includes("nextBeyondOffMs("));
check("the first frame picks the mesh from distance", terrainView.includes("initialTerrainCoarse("));
const tiles = sliceTerrainTiles(grid, [0, 0], 0, 1, 2);
check("tiles cover the small grid", tiles.length === 2);
const fullPosition = full.getAttribute("position");
const tilePosition = tiles[0].getAttribute("position");
check("tile corners match the full mesh", tilePosition.getX(0) === fullPosition.getX(0) && tilePosition.getZ(0) === fullPosition.getZ(0));
const fullNormal = full.getAttribute("normal");
const tileNormal = tiles[0].getAttribute("normal");
check("shared normals come from one pass", tileNormal.getY(0) === fullNormal.getY(0));
full.dispose();
for (const tile of tiles) tile.dispose();

if (failed > 0) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true }));
