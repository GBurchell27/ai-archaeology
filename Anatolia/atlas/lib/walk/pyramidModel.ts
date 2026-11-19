/**
 * Pure maths for a schematic model of stone pyramids on flat ground: a core of level courses as it stands, casing
 * where some is left, and the smooth form the casing once gave. Local metres, plan points are [east, south], y is up.
 */

import type { PlanPoint, StoneBox } from "./enclosureModel";
import type { HypothesisLayerId } from "./hypothesisLayers";
import type { LandmarkPlace } from "./landmarks";
import type { Obstacle } from "./walkObstacles";

const DEGREE = Math.PI / 180;

/** The published figures of one pyramid. A layout file gives the source of each. */
export type PyramidFigures = {
  id: string;
  name: string;
  /** The side of the square the casing stood on, its slope, and the height that follows from the two. */
  casingBaseM: number;
  faceAngleDeg: number;
  originalHeightM: number;
  /** The side of the core masonry at the ground, which is what stands where the casing is gone. */
  coreBaseM: number;
  presentHeightM: number;
  /** The side of the flat top that stands now, where it was measured. Without it the core is drawn parallel to the casing. */
  presentTopSideM?: number;
  /** The thickness every course is drawn with. */
  courseHeightM: number;
  /** How far the sides are turned from true north, clockwise, in arcminutes. Negative is west of north. */
  azimuthArcmin: number;
  /** Casing still stands from this height up to the present top. */
  casingStandsFromM?: number;
  /** The casing was of a darker stone, granite, up to this height. */
  darkCasingToM?: number;
};

export type Pyramid = PyramidFigures & { centre: PlanPoint };

/** A square block with sloping sides, wider at the bottom: a stretch of smooth casing, or a whole pyramid when its top side is 0. */
export type SquareFrustum = {
  centre: PlanPoint;
  bottomM: number;
  topM: number;
  bottomSideM: number;
  topSideM: number;
  yawRad: number;
  tone: "limestone" | "granite";
};

export type PyramidField = {
  pyramids: readonly Pyramid[];
  /** The core masonry of every pyramid, one block to a course. */
  courses: readonly StoneBox[];
  /** Casing that still stands. */
  standingCasing: readonly SquareFrustum[];
  /** Plain solids a little inside each core, which throw the shadows: the courses themselves are finer than the shadow map. */
  shadowSolids: readonly SquareFrustum[];
  obstacles: readonly Obstacle[];
  landmarkPlaces: Readonly<Record<string, LandmarkPlace>>;
  /** What a conjectural layer adds, drawn see-through over what stands. */
  layerDrawings: Readonly<Partial<Record<HypothesisLayerId, readonly SquareFrustum[]>>>;
};

/** The shadow solid stands this far inside the core's faces, so the lit courses are never in its shadow. */
const SHADOW_INSET_M = 2;
/** A card shows this far out from a pyramid's corners, and this far above its top for a flyer. */
const CARD_BEYOND_CORNER_M = 20;
const CARD_ABOVE_TOP_M = 80;
const LOOK_HEIGHT_M = 1.6;
/** The gold ring floats this far above the present top. */
const MARKER_ABOVE_TOP_M = 12;

/** The height of a pyramid whose faces rise at `faceAngleDeg` from a square base. */
export const heightFromSlopeM = (baseM: number, faceAngleDeg: number) => (baseM / 2) * Math.tan(faceAngleDeg * DEGREE);

/** three.js turns anticlockwise seen from above, and an azimuth runs clockwise. */
export const yawOfAzimuthRad = (azimuthArcmin: number) => (-azimuthArcmin / 60) * DEGREE;

/** The side of the casing at a height: the published base narrowing evenly to the published height. */
export function casingSideAtM(pyramid: PyramidFigures, heightM: number): number {
  return Math.max(0, pyramid.casingBaseM * (1 - heightM / pyramid.originalHeightM));
}

/** The side of the core at a height, narrowing evenly from its base to the top that stands now. */
export function coreSideAtM(pyramid: PyramidFigures, heightM: number): number {
  const insideCasingM = pyramid.casingBaseM - pyramid.coreBaseM;
  const topSideM = pyramid.presentTopSideM ?? casingSideAtM(pyramid, pyramid.presentHeightM) - insideCasingM;
  return pyramid.coreBaseM + (topSideM - pyramid.coreBaseM) * (heightM / pyramid.presentHeightM);
}

/** The core as level courses of one thickness, each a square block as wide as the core is at its foot. */
export function coreCourses(pyramid: Pyramid, random: () => number): StoneBox[] {
  const topM = pyramid.casingStandsFromM ?? pyramid.presentHeightM;
  const count = Math.max(1, Math.round(topM / pyramid.courseHeightM));
  const thicknessM = topM / count;
  const [east, south] = pyramid.centre;
  return Array.from({ length: count }, (_, course) => {
    const sideM = coreSideAtM(pyramid, course * thicknessM);
    return {
      kind: "stone",
      centre: [east, (course + 0.5) * thicknessM, south],
      size: [sideM, thicknessM, sideM],
      yawRad: yawOfAzimuthRad(pyramid.azimuthArcmin),
      shade: 0.9 + 0.14 * random(),
    };
  });
}

function casingBetween(pyramid: Pyramid, bottomM: number, topM: number, tone: SquareFrustum["tone"]): SquareFrustum {
  const yawRad = yawOfAzimuthRad(pyramid.azimuthArcmin);
  return { centre: pyramid.centre, bottomM, topM, bottomSideM: casingSideAtM(pyramid, bottomM), topSideM: casingSideAtM(pyramid, topM), yawRad, tone };
}

/** The casing left on the upper part of a pyramid, up to its present top. */
export function standingCasing(pyramid: Pyramid): SquareFrustum[] {
  return pyramid.casingStandsFromM === undefined ? [] : [casingBetween(pyramid, pyramid.casingStandsFromM, pyramid.presentHeightM, "limestone")];
}

/** The whole casing up to the point, in two stretches where its foot was of granite. */
export function casingAsBuilt(pyramid: Pyramid): SquareFrustum[] {
  const darkToM = pyramid.darkCasingToM ?? 0;
  const upper = casingBetween(pyramid, darkToM, pyramid.originalHeightM, "limestone");
  return darkToM > 0 ? [casingBetween(pyramid, 0, darkToM, "granite"), upper] : [upper];
}

function shadowSolid(pyramid: Pyramid): SquareFrustum {
  const sideAtM = (heightM: number) => Math.max(0.5, coreSideAtM(pyramid, heightM) - 2 * SHADOW_INSET_M);
  return { centre: pyramid.centre, bottomM: 0, topM: pyramid.presentHeightM, bottomSideM: sideAtM(0), topSideM: sideAtM(pyramid.presentHeightM), yawRad: yawOfAzimuthRad(pyramid.azimuthArcmin), tone: "limestone" };
}

/** The foot of the core: a walker goes round it, and a flyer over it. */
export function pyramidObstacle(pyramid: Pyramid): Obstacle {
  return { centre: pyramid.centre, halfSizeM: [pyramid.coreBaseM / 2, pyramid.coreBaseM / 2], yawRad: yawOfAzimuthRad(pyramid.azimuthArcmin), roundM: 0 };
}

/**
 * Where a pyramid's card shows: anywhere within reach of its foot, since nobody stands at its centre, and for a flyer
 * up to a little above its top. The gold ring floats over the top.
 */
export function pyramidLandmarkPlace(pyramid: Pyramid): LandmarkPlace {
  const [east, south] = pyramid.centre;
  return {
    positionM: [east, LOOK_HEIGHT_M, south],
    markerM: [east, pyramid.presentHeightM + MARKER_ABOVE_TOP_M, south],
    rangeM: pyramid.casingBaseM / Math.SQRT2 + CARD_BEYOND_CORNER_M,
    surrounds: true,
    reachHeightM: pyramid.presentHeightM + CARD_ABOVE_TOP_M,
  };
}

/** Everything drawn and walked round for a group of pyramids. `random` only varies the tone of the courses. */
export function pyramidField(pyramids: readonly Pyramid[], random: () => number): PyramidField {
  return {
    pyramids,
    courses: pyramids.flatMap((pyramid) => coreCourses(pyramid, random)),
    standingCasing: pyramids.flatMap(standingCasing),
    shadowSolids: pyramids.map(shadowSolid),
    obstacles: pyramids.map(pyramidObstacle),
    landmarkPlaces: Object.fromEntries(pyramids.map((pyramid) => [pyramid.id, pyramidLandmarkPlace(pyramid)])),
    layerDrawings: { casing: pyramids.flatMap(casingAsBuilt) },
  };
}
