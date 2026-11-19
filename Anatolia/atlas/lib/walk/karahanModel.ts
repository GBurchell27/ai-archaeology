/**
 * The walkable model of Structures AA to AD at Karahan Tepe, assembled from the layout. Unlike Göbekli Tepe these
 * buildings are cut down into bedrock, so the model is a rock terrace at y = 0 with sunken rooms, not rings on a floor.
 * The walker starts at the origin, on AD's floor, looking north.
 */

import { seededRandom, type WalkModel } from "./enclosureModel";
import { KARAHAN_TEPE_HYPOTHESES, karahanLayerDrawings } from "./karahanHypotheses";
import { karahanLandmarkPlaces } from "./karahanLandmarkPlaces";
import { acBoxes, acRockMasses, adBoxes, adRockMasses } from "./karahanMainBuilding";
import { FLOOR_M, LOW_GROUND_M, structureOutline, sunkenRooms, terraceOutline } from "./karahanPlan";
import { rockRoomParts } from "./karahanRockRooms";
import { KARAHAN_TEPE_MODEL_NOTE, KARAHAN_TEPE_SOURCES, KARAHAN_TEPE_WALK_RADIUS_M, KARAHAN_TEPE_WALKER_START } from "./karahanTepeLayout";
import type { RockCutModel } from "./rockCutModel";

const STONE_SEED = 2019;
/** AD's floor patch lies just above the low ground it is level with, so the two never fight for the same depth. */
const FLOOR_LIFT_M = 0.02;

function karahanRockCut(): RockCutModel {
  const random = seededRandom(STONE_SEED);
  const rooms = sunkenRooms();
  const parts = rockRoomParts();
  return {
    ...parts,
    terraceOutline: terraceOutline(),
    lowGroundM: LOW_GROUND_M,
    rooms,
    floors: [...rooms.map(({ id, outline, floorM }) => ({ id, outline, heightM: floorM })), { id: "AD", outline: structureOutline("AD"), heightM: FLOOR_M.AD + FLOOR_LIFT_M }],
    boxes: [...adBoxes(random), ...acBoxes(random), ...parts.boxes],
    rockMasses: [...adRockMasses(), ...acRockMasses(), ...parts.rockMasses],
    landmarkPlaces: karahanLandmarkPlaces(),
    layerDrawings: karahanLayerDrawings(),
  };
}

const { eastM: startEastM, northM: startNorthM } = KARAHAN_TEPE_WALKER_START.position;

export const KARAHAN_TEPE_MODEL: WalkModel = {
  enclosures: [],
  // The layout's radius is measured from AD's centre; the walker's limit is measured from where they start.
  walkRadiusM: KARAHAN_TEPE_WALK_RADIUS_M + Math.hypot(startEastM, startNorthM),
  note: KARAHAN_TEPE_MODEL_NOTE,
  sources: KARAHAN_TEPE_SOURCES.map(({ label, url }) => ({ label, url })),
  hypotheses: KARAHAN_TEPE_HYPOTHESES,
  rockCut: karahanRockCut(),
};
