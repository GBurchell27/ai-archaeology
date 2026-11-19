/**
 * Where each Karahan Tepe landmark stands in the model, keyed by the layout element it names. Positions come from the
 * same derived plan the scene is drawn from, so a card always belongs to the stone in front of the walker.
 */

import { centreOf, FLOOR_M, radiusOf, roomWalls, structure } from "./karahanPlan";
import { abHeadCentre, abRowPoints, channelPath, portholeCentre } from "./karahanRockRooms";
import type { LandmarkPlace } from "./landmarks";
import type { Vec3 } from "./walkMovement";

const LOOK_HEIGHT_M = 1.6;
const FEATURE_RANGE_M = 4.5;
/** Markers float above the rock surface, at heights that keep neighbours apart. */
const LOW_MARKER_M = 0.9;
const MIDDLE_MARKER_M = 1.6;
const HIGH_MARKER_M = 3;
const AROUND_AC_M = 1.5;

/** One thing to walk up to and face. */
function feature(positionM: Vec3, markerHeightM = LOW_MARKER_M): LandmarkPlace {
  return { positionM, markerM: [positionM[0], markerHeightM, positionM[2]], rangeM: FEATURE_RANGE_M, surrounds: false };
}

/** A whole building the walker stands in. */
function building(id: "AD" | "AB" | "AC", rangeM: number, markerHeightM: number): LandmarkPlace {
  const [east, south] = centreOf(id);
  return { positionM: [east, FLOOR_M[id] + LOOK_HEIGHT_M, south], markerM: [east, markerHeightM, south], rangeM, surrounds: true };
}

function adCentralPair(): LandmarkPlace {
  const [east, south] = centreOf("AD");
  const pairHeightM = structure("AD").pillarGroups.find((group) => group.id === "ad-central-pair")?.heightM ?? 0;
  return feature([east, FLOOR_M.AD + LOOK_HEIGHT_M, south], FLOOR_M.AD + pairHeightM + LOW_MARKER_M);
}

/** The pillars' card stands at the north end of the back row, so the space in front of the head is the head's. */
function abBackRow(): LandmarkPlace {
  const [east, south] = abRowPoints("back").reduce((northmost, point) => (point[1] < northmost[1] ? point : northmost));
  return feature([east, FLOOR_M.AB + LOOK_HEIGHT_M / 2, south], MIDDLE_MARKER_M);
}

function aaBench(): LandmarkPlace {
  const [bench] = structure("AA").benches;
  const [, south] = centreOf("AA");
  return feature([roomWalls("AA").westM + bench.depthM / 2, FLOOR_M.AA + bench.heightM, south]);
}

function serpentineChannel(): LandmarkPlace {
  const path = channelPath();
  const [east, south] = path[Math.floor(path.length / 2)];
  return feature([east, 0, south], MIDDLE_MARKER_M);
}

export function karahanLandmarkPlaces(): Record<string, LandmarkPlace> {
  const { eastWestM, northSouthM } = structure("AB").footprint;
  return {
    "ad-wall-bench": building("AD", radiusOf("AD"), HIGH_MARKER_M),
    "ad-central-pair": adCentralPair(),
    AB: building("AB", Math.min(eastWestM, northSouthM) / 2, HIGH_MARKER_M),
    "ab-west-ledge": feature(abHeadCentre()),
    "ab-back-row": abBackRow(),
    "ad-to-ab-porthole": feature(portholeCentre()),
    "ab-serpentine-channel": serpentineChannel(),
    "aa-west-bench": aaBench(),
    AC: building("AC", radiusOf("AC") + AROUND_AC_M, FLOOR_M.AC + HIGH_MARKER_M),
  };
}
