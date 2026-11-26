/**
 * Stand a pyramid field on bases that are not all at y = 0. Plan positions stay.
 * The courses are still built from a local ground; only the height of that ground changes.
 */

import type { Block, PlanPoint } from "./enclosureModel";
import type { HypothesisLayerId } from "./hypothesisLayers";
import type { LandmarkPlace, PlacedLandmark } from "./landmarks";
import type { PyramidField, SquareFrustum } from "./pyramidModel";
import type { Vec3 } from "./walkMovement";

/** Each pyramid's courses, casing and card raised by its base. Obstacles stay on the plan. */
export function liftPyramidField(field: PyramidField, baseOffsetM: Readonly<Record<string, number>>): PyramidField {
  const raised = (centre: PlanPoint) => offsetAt(field, baseOffsetM, centre);
  return {
    ...field,
    courses: field.courses.map((course) => liftBlock(course, raised([course.centre[0], course.centre[2]]))),
    standingCasing: field.standingCasing.map((frustum) => liftFrustum(frustum, raised(frustum.centre))),
    shadowSolids: field.shadowSolids.map((frustum) => liftFrustum(frustum, raised(frustum.centre))),
    landmarkPlaces: liftPlaces(field.landmarkPlaces, baseOffsetM),
    layerDrawings: liftLayers(field.layerDrawings, raised),
  };
}

/** Cards already placed on the unlifted field, raised with the pyramid they name. */
export function liftPlacedLandmarks(placed: readonly PlacedLandmark[], baseOffsetM: Readonly<Record<string, number>>): PlacedLandmark[] {
  return placed.map((item) => liftPlaced(item, baseOffsetM[item.landmark.placeId ?? ""] ?? 0));
}

function offsetAt(field: PyramidField, baseOffsetM: Readonly<Record<string, number>>, centre: PlanPoint): number {
  const pyramid = field.pyramids.find((item) => item.centre[0] === centre[0] && item.centre[1] === centre[1]);
  return pyramid ? baseOffsetM[pyramid.id] ?? 0 : 0;
}

function liftBlock<BlockT extends Block>(block: BlockT, upM: number): BlockT {
  if (upM === 0) return block;
  const [east, up, south] = block.centre;
  return { ...block, centre: [east, up + upM, south] };
}

function liftFrustum(frustum: SquareFrustum, upM: number): SquareFrustum {
  if (upM === 0) return frustum;
  return { ...frustum, bottomM: frustum.bottomM + upM, topM: frustum.topM + upM };
}

function liftPlaces(places: Readonly<Record<string, LandmarkPlace>>, baseOffsetM: Readonly<Record<string, number>>): Record<string, LandmarkPlace> {
  return Object.fromEntries(Object.entries(places).map(([id, place]) => [id, liftPlace(place, baseOffsetM[id] ?? 0)]));
}

function liftPlace(place: LandmarkPlace, upM: number): LandmarkPlace {
  if (upM === 0) return place;
  return { ...place, positionM: addUp(place.positionM, upM), markerM: addUp(place.markerM, upM) };
}

function liftPlaced(item: PlacedLandmark, upM: number): PlacedLandmark {
  if (upM === 0) return item;
  return { ...item, positionM: addUp(item.positionM, upM), markerM: addUp(item.markerM, upM) };
}

function liftLayers(
  layers: PyramidField["layerDrawings"],
  raised: (centre: PlanPoint) => number,
): PyramidField["layerDrawings"] {
  const lifted: Partial<Record<HypothesisLayerId, readonly SquareFrustum[]>> = {};
  for (const [layerId, frustums] of Object.entries(layers) as [HypothesisLayerId, readonly SquareFrustum[]][]) {
    lifted[layerId] = frustums.map((frustum) => liftFrustum(frustum, raised(frustum.centre)));
  }
  return lifted;
}

function addUp(point: Vec3, upM: number): Vec3 {
  return [point[0], point[1] + upM, point[2]];
}
