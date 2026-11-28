/**
 * The walkable model of the three main pyramids of Giza, assembled from the layout: three cores of level courses,
 * lifted onto the prebuilt ground by the walk, with the walker starting at the origin, looking north.
 */

import { seededRandom, type PlanPoint, type WalkModel } from "./enclosureModel";
import { GIZA_HYPOTHESES } from "./gizaHypotheses";
import { GIZA_CENTRES_FROM_KHUFU, GIZA_MODEL_NOTE, GIZA_PYRAMIDS, GIZA_SOURCES, GIZA_SURVEY_AXES_ARCMIN, GIZA_WALK_RADIUS_M, GIZA_WALK_SCALE, GIZA_WALKER_START_FROM_KHUFU } from "./gizaLayout";
import { pyramidField, yawOfAzimuthRad, type Pyramid } from "./pyramidModel";

const COURSE_TONE_SEED = 1883;

/** A distance south and west on the survey's axes, as [east, south] on true ones. */
function onTrueAxes({ southM, westM }: { southM: number; westM: number }): PlanPoint {
  // The survey's north lies this far anticlockwise of true north.
  const turnRad = yawOfAzimuthRad(GIZA_SURVEY_AXES_ARCMIN);
  return [southM * Math.sin(turnRad) - westM * Math.cos(turnRad), southM * Math.cos(turnRad) + westM * Math.sin(turnRad)];
}

/** The pyramids placed in walk metres: the walker's start is the origin. */
export function gizaPyramids(): Pyramid[] {
  const [startEast, startSouth] = onTrueAxes(GIZA_WALKER_START_FROM_KHUFU);
  return GIZA_PYRAMIDS.map((figures) => {
    const [east, south] = onTrueAxes(GIZA_CENTRES_FROM_KHUFU[figures.id]);
    return { ...figures, centre: [east - startEast, south - startSouth] };
  });
}

export const GIZA_MODEL: WalkModel = {
  enclosures: [],
  walkRadiusM: GIZA_WALK_RADIUS_M,
  note: GIZA_MODEL_NOTE,
  sources: Object.values(GIZA_SOURCES),
  hypotheses: GIZA_HYPOTHESES,
  pyramidField: pyramidField(gizaPyramids(), seededRandom(COURSE_TONE_SEED)),
  scale: GIZA_WALK_SCALE,
  terrainId: "giza",
};
