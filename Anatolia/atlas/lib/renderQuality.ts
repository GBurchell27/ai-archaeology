/** Frame-time ladder for the national terrain. Pure: the canvas applies the result. */

export const DPR_STEPS = [1, 0.75, 0.55, 0.4] as const;
export const INITIAL_DPR_INDEX = 2;
export const TILE_DISTANCE_M = 150_000;
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
 * Far views use one coarse mesh. Inside the tile distance the full tiles load
 * even when a software renderer never gets under the frame-time headroom.
 * The ladder still lowers the buffer; it does not hold the coarse surface.
 */
export function nextTerrainCoarse(
  _coarse: boolean,
  distanceM: number,
  _meanFrameMs: number,
  _dprAtFloor: boolean,
): boolean {
  return distanceM >= TILE_DISTANCE_M;
}

export function meanFrameMs(samples: readonly number[]): number {
  if (samples.length === 0) return 0;
  let total = 0;
  for (const sample of samples) total += sample;
  return total / samples.length;
}
