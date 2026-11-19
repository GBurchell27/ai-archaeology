/**
 * The conjectural layers offered for Karahan Tepe, and what each draws. Each names whose reading it is and how far
 * it goes beyond the report. There is no surroundings layer: no vegetation study of the site was found (see the
 * open questions in karahanTepeLandmarks.ts), so any tree would be a guess.
 */

import { beamBetween, seededRandom, type PlanPoint, type StoneBox } from "./enclosureModel";
import type { HypothesisLayer } from "./hypothesisLayers";
import { centreOf, FLOOR_M, roomWalls, structure, structureOutline } from "./karahanPlan";
import { abRowPoints } from "./karahanRockRooms";
import { AB_FILL, KARAHAN_TEPE_DRAWING_ESTIMATES as ESTIMATES, KARAHAN_TEPE_SOURCES } from "./karahanTepeLayout";
import { scaledOutline } from "./planOutline";
import { cappingSlabs, type LayerDrawing, type Prism, type RockCutModel } from "./rockCutModel";

const sourceByKey = (key: string) => KARAHAN_TEPE_SOURCES.filter((source) => source.key === key).map(({ label, url }) => ({ label, url }));

/**
 * Where "Show me" stands the walker, since neither layer can be seen from the start inside AD: on the terrace at the
 * southern end of the rock left between AB and AA, a room on either side. A camera position only, chosen by eye.
 */
const BESIDE_THE_ROOMS_M = 2;
const STAND_BETWEEN_ROOMS = [(roomWalls("AB").westM + roomWalls("AA").eastM) / 2, roomWalls("AB").southM + BESIDE_THE_ROOMS_M] as const;

export const KARAHAN_TEPE_HYPOTHESES: readonly HypothesisLayer[] = [
  {
    id: "backfill",
    label: "Buried on purpose",
    note:
      "Karul found Structures AA, AB and AC filled and capped with large flat stones that stop at each building's edge, with stones set on AB's six shorter pillars, " +
      "and reads this as deliberate burial in stages. That is the excavator's reading in a preliminary report; why the buildings were buried is not known. " +
      "AB's two fill layers are drawn at their published thickness. AA's fill, the size of the stones and the open southern half of each cap, left off so the room can be seen, are this model's own.",
    sources: [...sourceByKey("K21"), ...sourceByKey("AM24")],
    where: "Drawn in Structures AB and AA, on the terrace behind the rock wall north-west of the start.",
    viewpoint: { standAt: STAND_BETWEEN_ROOMS, lookAt: [STAND_BETWEEN_ROOMS[0], FLOOR_M.AA, centreOf("AB")[1]] },
  },
  {
    id: "roofs",
    label: "A cover over Structure AB",
    note:
      "Karul notes a slightly carved bed along the straight upper east edge of AB and calls it 'probably related to the top cover'. That remark is all there is: " +
      "no beam sockets or roof remains are described and the report reconstructs no roof. The flat timbers and see-through cover are this model's own guess. " +
      "No roof is drawn for Structure AD: no source describes one, and 23 m is a very long span.",
    sources: sourceByKey("K21"),
    where: "Drawn over Structure AB, on the terrace behind the rock wall north of the start.",
    viewpoint: { standAt: STAND_BETWEEN_ROOMS, lookAt: [centreOf("AB")[0], 0, centreOf("AB")[1]] },
  },
];

const SOIL_COLOUR = "#9a5a3c";
const DARK_FILL_COLOUR = "#3d342b";
const FILL_OPACITY = 0.5;
/** Fill and cover stop just short of the rock faces, so the two never share a surface. */
const FILL_INSET = 0.985;
/** The capping stones stand a little proud of the rock they rest on. */
const CAP_TOP_M = 0.05;
const TOPPING_STONE_M = 0.42;
const TOPPING_STONE_COUNT = 3;
const HYPOTHESIS_SEED = 2021;
const BEAM_COUNT = 5;
const BEAM_M = 0.2;
const BEAM_OVERHANG_M = 0.6;
const COVER_COLOUR = "#9c8456";
const COVER_THICKNESS_M = 0.06;

const capBottomM = CAP_TOP_M - ESTIMATES.cappingSlab.thicknessM;

function fill(id: "AB" | "AA", layer: string, bottomM: number, topM: number, colour: string): Prism {
  return { id: `${id}-${layer}`, outline: scaledOutline(structureOutline(id), centreOf(id), FILL_INSET), bottomM, topM, colour, opacity: FILL_OPACITY };
}

function fillPrisms(): Prism[] {
  const soilTopM = FLOOR_M.AB + AB_FILL.sterileSoilM;
  return [
    fill("AB", "sterile-soil", FLOOR_M.AB, soilTopM, SOIL_COLOUR),
    fill("AB", "dark-fill", soilTopM, soilTopM + AB_FILL.darkFillM, DARK_FILL_COLOUR),
    fill("AA", "fill", FLOOR_M.AA, capBottomM, DARK_FILL_COLOUR),
  ];
}

/** The cap over the northern half of a room. The southern half is left off so the room stays in view. */
function halfCap(id: "AB" | "AA", random: () => number): StoneBox[] {
  const [, centreSouth] = centreOf(id);
  return cappingSlabs(structureOutline(id), CAP_TOP_M, ESTIMATES.cappingSlab, random, ([, south]: PlanPoint) => south < centreSouth);
}

/** [K21] stones set on each of the six shorter pillars to bring it up to the capping stones. */
function pillarToppingStones(random: () => number): StoneBox[] {
  const pillarTopM = FLOOR_M.AB + (structure("AB").pillarGroups.find((group) => group.id === "ab-back-row")?.heightM ?? 0);
  const stoneHeightM = (capBottomM - pillarTopM) / TOPPING_STONE_COUNT;
  return abRowPoints("back").flatMap(([east, south]) =>
    Array.from({ length: TOPPING_STONE_COUNT }, (_, level): StoneBox => ({
      // A small rough stone like a wall stone, not a slab: a slab's worn edge would eat half of it.
      kind: "stone",
      centre: [east, pillarTopM + (level + 0.5) * stoneHeightM, south],
      size: [TOPPING_STONE_M, stoneHeightM, TOPPING_STONE_M],
      yawRad: random() * Math.PI,
      shade: 0.75 + 0.3 * random(),
    })),
  );
}

function backfillDrawing(): LayerDrawing {
  const random = seededRandom(HYPOTHESIS_SEED);
  return { prisms: fillPrisms(), boxes: [...halfCap("AB", random), ...halfCap("AA", random), ...pillarToppingStones(random)] };
}

/** Timbers laid east to west across AB on the rock, under a thin see-through cover. */
function coverDrawing(): LayerDrawing {
  const { westM, eastM, northM, southM } = roomWalls("AB");
  const beams = Array.from({ length: BEAM_COUNT }, (_, beam) => {
    const south = northM + ((beam + 0.5) / BEAM_COUNT) * (southM - northM);
    return beamBetween([westM - BEAM_OVERHANG_M, BEAM_M / 2, south], [eastM + BEAM_OVERHANG_M, BEAM_M / 2, south], BEAM_M, BEAM_M, "timber");
  });
  const outline = scaledOutline(structureOutline("AB"), centreOf("AB"), 1.12);
  return { boxes: beams, prisms: [{ id: "AB-cover", outline, bottomM: BEAM_M, topM: BEAM_M + COVER_THICKNESS_M, colour: COVER_COLOUR, opacity: FILL_OPACITY }] };
}

export function karahanLayerDrawings(): RockCutModel["layerDrawings"] {
  return { backfill: backfillDrawing(), roofs: coverDrawing() };
}
