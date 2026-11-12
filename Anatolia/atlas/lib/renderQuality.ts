/** Frame-time ladder for the national terrain. Pure: the canvas applies the result. */

export const DPR_STEPS = [1, 0.75, 0.55, 0.4] as const;
export const INITIAL_DPR_INDEX = 2;
export const TILE_ON_M = 140_000;
export const TILE_OFF_M = 160_000;
export const TILE_RELEASE_MS = 10_000;
export const FRAME_BUDGET_MS = 22;
export const FRAME_HEADROOM_MS = 13;
export const QUALITY_SAMPLE_COUNT = 8;

export interface QualityState {
  dprIndex: number;
  fastShade: boolean;
}

export function initialQuality(): QualityState {
  return { dprIndex: INITIAL_DPR_INDEX, fastShade: false };
}

export function dprForIndex(index: number): number {
  const clamped = Math.min(DPR_STEPS.length - 1, Math.max(0, index));
  return DPR_STEPS[clamped];
}

/**
 * Slow frames step the buffer down, then skip the gamma passes.
 * Fast frames restore gamma first, then the buffer, so the two don't fight.
 */
export function nextQuality(state: QualityState, meanFrameMs: number): QualityState {
  const atFloor = state.dprIndex >= DPR_STEPS.length - 1;
  if (meanFrameMs > FRAME_BUDGET_MS) {
    if (!atFloor) return { dprIndex: state.dprIndex + 1, fastShade: state.fastShade };
    return { dprIndex: state.dprIndex, fastShade: true };
  }
  if (meanFrameMs < FRAME_HEADROOM_MS) {
    if (state.fastShade) return { dprIndex: state.dprIndex, fastShade: false };
    if (state.dprIndex > 0) return { dprIndex: state.dprIndex - 1, fastShade: false };
  }
  return state;
}

/**
 * First mesh for a session. Inside the 140–160 km band the distance itself
 * decides, instead of inheriting the default coarse mesh.
 */
export function initialTerrainCoarse(distanceM: number): boolean {
  if (distanceM < TILE_ON_M) return false;
  if (distanceM > TILE_OFF_M) return true;
  return distanceM >= (TILE_ON_M + TILE_OFF_M) / 2;
}

/**
 * Tiles turn on inside 140 km and off outside 160 km. Between those distances
 * the current mesh stays, so the view does not flicker on the boundary.
 * Frame time does not hold a close view on the coarse mesh.
 */
export function nextTerrainCoarse(
  coarse: boolean,
  distanceM: number,
  _meanFrameMs: number,
  _dprAtFloor: boolean,
): boolean {
  if (distanceM < TILE_ON_M) return false;
  if (distanceM > TILE_OFF_M) return true;
  return coarse;
}

/** Drop the tile meshes only after the camera has stayed outside the off distance. */
export function tileReleaseDue(distanceM: number, elapsedBeyondOffMs: number): boolean {
  if (distanceM <= TILE_OFF_M) return false;
  return elapsedBeyondOffMs >= TILE_RELEASE_MS;
}

/** Clock for {@link tileReleaseDue}. Coming back inside the off distance resets it. */
export function nextBeyondOffMs(distanceM: number, elapsedBeyondOffMs: number, deltaMs: number): number {
  if (distanceM <= TILE_OFF_M) return 0;
  return elapsedBeyondOffMs + Math.max(0, deltaMs);
}

export function meanFrameMs(samples: readonly number[]): number {
  if (samples.length === 0) return 0;
  let total = 0;
  for (const sample of samples) total += sample;
  return total / samples.length;
}
