/**
 * The Giza ground: bilinear height, lifting a pyramid onto its base, and the committed window.
 * Run from Anatolia/atlas: node --experimental-strip-types scripts/check_giza_terrain.mts
 */

import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

register(`data:text/javascript,${encodeURIComponent(`
  export function resolve(specifier, context, next) {
    const bare = specifier.startsWith(".") && !specifier.slice(specifier.lastIndexOf("/")).includes(".");
    return next(bare ? specifier + ".ts" : specifier, context);
  }
`)}`);

const { decodeGizaHeight, heightAt, readGizaTerrainRecord } = await import("../lib/walk/gizaTerrain.ts");
const { liftPyramidField } = await import("../lib/walk/pyramidLift.ts");
const { GIZA_MODEL } = await import("../lib/walk/gizaModel.ts");
const { GIZA_CC_BY_URL, GIZA_RELIEF_CREDIT, GIZA_SENTINEL_YEAR, GIZA_SOURCES } = await import("../lib/walk/gizaLayout.ts");
const { findWalkSite } = await import("../lib/walk/walkSites.ts");
const { gizaPyramids } = await import("../lib/walk/gizaModel.ts");
const { modelObstacles } = await import("../lib/walk/modelObstacles.ts");
const { moveLimits, moveStep, startPosition } = await import("../lib/walk/walkMovement.ts");
const { obstructedBy } = await import("../lib/walk/walkObstacles.ts");
const { walkScaleOf } = await import("../lib/walk/walkScale.ts");
const { intentFromKeys } = await import("../lib/walk/walkKeys.ts");

import type { GizaTerrain, GizaTerrainRecord } from "../lib/walk/gizaTerrain.ts";

let failed = 0;

function check(label: string, condition: boolean): void {
  if (condition) return;
  failed += 1;
  console.error("FAIL", label);
}

const near = (left: number, right: number, tolerance = 1e-6) => Math.abs(left - right) <= tolerance;

function sampleTerrain(values: number[], width: number, height: number, datumM = 0): GizaTerrain {
  const record: GizaTerrainRecord = {
    width,
    height,
    cellM: 10,
    westM: 0,
    northM: 0,
    minM: 0,
    maxM: 100,
    datumM,
    baseOffsetM: { khufu: 0, khafre: 0, menkaure: 0 },
    reliefCredit: "relief",
    imageryCredit: "imagery",
    imageryDay: "2024-01-01",
    sceneId: "scene",
    note: "note",
  };
  return { ...record, metres: Float32Array.from(values) };
}

const flat = sampleTerrain([0, 10, 30, 40], 2, 2);
check("a cell centre is that cell", heightAt(flat, 5, 5) === 0 && heightAt(flat, 15, 15) === 40);
check("the midpoint of two cells is their mean", near(heightAt(flat, 10, 5), 5) && near(heightAt(flat, 5, 10), 15));
check("outside the window the edge cell is used", heightAt(flat, -40, 5) === 0 && heightAt(flat, 80, 80) === 40);
check("the datum is the height of y = 0", near(heightAt(sampleTerrain([20, 20, 20, 20], 2, 2, 12), 5, 5), 8));

const encoded = new Uint16Array([0, 32768, 65535]);
const decoded = decodeGizaHeight(encoded.buffer, { ...flat, width: 3, height: 1, minM: 10, maxM: 30 });
check("uint16 0 and 65535 are the stated ends", near(decoded[0], 10) && near(decoded[2], 30) && near(decoded[1], 20, 0.01));
check("a record without a pyramid base is refused", (() => {
  try {
    readGizaTerrainRecord({ ...flat, metres: undefined, baseOffsetM: { khufu: 1 } });
    return false;
  } catch {
    return true;
  }
})());

const raised = liftPyramidField(GIZA_MODEL.pyramidField!, { khufu: 4, khafre: -2, menkaure: 0 });
const khufu = GIZA_MODEL.pyramidField!.pyramids[0];
const liftedCourse = raised.courses.find((course) => course.centre[0] === khufu.centre[0]);
const originalCourse = GIZA_MODEL.pyramidField!.courses.find((course) => course.centre[0] === khufu.centre[0]);
check("lifting a pyramid raises its courses and not its plan", liftedCourse !== undefined && originalCourse !== undefined && near(liftedCourse.centre[1], originalCourse.centre[1] + 4) && liftedCourse.centre[0] === originalCourse.centre[0] && liftedCourse.centre[2] === originalCourse.centre[2]);
check("a pyramid with no offset stays put, and the obstacles are the plan", raised.pyramids[2].centre[1] === GIZA_MODEL.pyramidField!.pyramids[2].centre[1] && raised.obstacles === GIZA_MODEL.pyramidField!.obstacles && near(raised.shadowSolids[1].bottomM, -2));
check("the card rises with the pyramid", near(raised.landmarkPlaces.khufu.markerM[1], GIZA_MODEL.pyramidField!.landmarkPlaces.khufu.markerM[1] + 4));

const recordPath = new URL("../public/walk/giza/terrain.json", import.meta.url);
const heightPath = new URL("../public/walk/giza/height.u16", import.meta.url);
const drapePath = new URL("../public/walk/giza/drape.jpg", import.meta.url);
const record = readGizaTerrainRecord(JSON.parse(readFileSync(recordPath, "utf8")));
const heightBytes = readFileSync(heightPath);
const heightBuffer = heightBytes.buffer.slice(heightBytes.byteOffset, heightBytes.byteOffset + heightBytes.byteLength);
const committed: GizaTerrain = { ...record, metres: decodeGizaHeight(heightBuffer, record) };
const site = findWalkSite("Q12508");
check("Giza stays a model with no photographs", site?.modelOnly === true && site.modelId === "giza-pyramids" && GIZA_MODEL.terrainId === "giza");
check("the height file matches the record", heightBytes.byteLength === record.width * record.height * 2 && record.cellM === 15 && record.width * record.cellM === 6000);
const sharedReliefCredit = reliefCreditFromPython();
check("one relief credit names Google, the preprint, the GLO-30 fill and CC BY", sameReliefCredit(record.reliefCredit, GIZA_SOURCES.relief.label, sharedReliefCredit) && GIZA_SOURCES.relief.url === GIZA_CC_BY_URL);
check("the imagery credit names the Sentinel year", record.imageryCredit === `Contains modified Copernicus Sentinel data ${GIZA_SENTINEL_YEAR}` && record.imageryDay.startsWith(String(GIZA_SENTINEL_YEAR)) && GIZA_SOURCES.imagery.label === record.imageryCredit);
check("the footprint note is in the record and the footer", record.note.includes("flattened") && GIZA_MODEL.note.includes("flattened") && GIZA_MODEL.note.includes("31 to 36 m") && record.note.includes("31 to 36 m"));

for (const pyramid of gizaPyramids()) {
  const offset = record.baseOffsetM[pyramid.id];
  check(`${pyramid.id} stands on its flattened base`, near(heightAt(committed, pyramid.centre[0], pyramid.centre[1]), offset, 0.05));
}
check("the start is on the plateau, near the datum", Math.abs(heightAt(committed, 0, 0)) < 40);

const ground = (east: number, south: number) => heightAt(committed, east, south);
const limits = moveLimits(site!.eyeHeightM, GIZA_MODEL.walkRadiusM, ground, obstructedBy(modelObstacles(GIZA_MODEL), ground), walkScaleOf(GIZA_MODEL));
const start = startPosition(limits);
check("the walker starts an eye above the ground", near(start[1], ground(0, 0) + site!.eyeHeightM));
const walked = moveStep({ position: start, velocity: [0, 0, 0] }, "walk", [0, 0, -1], intentFromKeys(new Set(["KeyW"])), limits, 0.4);
check("a step north stays on the ground", walked.position[2] < start[2] && near(walked.position[1], ground(walked.position[0], walked.position[2]) + site!.eyeHeightM, 0.15));

const assetBytes = [recordPath, heightPath, drapePath].reduce((sum, path) => sum + statSync(path).size, 0);
check("the committed ground is within 1.5 MB", assetBytes <= 1.5 * 1024 * 1024 && statSync(drapePath).size > 1000);

function sameReliefCredit(recordCredit: string, label: string, shared: string): boolean {
  return recordCredit === label && recordCredit === shared && recordCredit === GIZA_RELIEF_CREDIT
    && recordCredit.includes("This dataset is produced by Google")
    && recordCredit.includes("(experimental preprint)")
    && recordCredit.includes("Voids filled from Copernicus DEM GLO-30")
    && recordCredit.includes("Contains modified Copernicus DEM data")
    && recordCredit.includes(GIZA_CC_BY_URL);
}

function reliefCreditFromPython(): string {
  const scriptsDir = fileURLToPath(new URL(".", import.meta.url));
  return execFileSync("python3", ["-c", "import terrain_credits; print(terrain_credits.GIZA_RELIEF_CREDIT, end='')"], {
    cwd: scriptsDir,
    encoding: "utf8",
  });
}

console.log(JSON.stringify({ ok: failed === 0, failed, assetBytes }));
process.exit(failed === 0 ? 0 : 1);
