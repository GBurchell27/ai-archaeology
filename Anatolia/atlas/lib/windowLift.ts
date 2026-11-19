/**
 * The average brightness (0 to 1, on the encoded image) of the Göbekli Tepe true-colour window, which the
 * site image grade in `sceneRasters.ts` was set by eye for. Darker windows are lifted towards it.
 */
export const WINDOW_TARGET_LUMA = 0.41;
/** The strongest lift, so an image that really is dark (basalt, a reservoir) is not turned grey. [EST] */
export const WINDOW_LIFT_MIN_EXPONENT = 0.6;

/** Average brightness, 0 to 1, of RGBA bytes. */
export function meanLuma(rgba: ArrayLike<number>): number {
  let sum = 0;
  for (let index = 0; index + 3 < rgba.length; index += 4) {
    sum += 0.2126 * rgba[index] + 0.7152 * rgba[index + 1] + 0.0722 * rgba[index + 2];
  }
  return rgba.length >= 4 ? sum / (rgba.length / 4) / 255 : 0;
}

/**
 * The exponent that takes a window of this average brightness to the target: 1 leaves it alone, less lifts it.
 * Every window is already stretched to white, so a plain gain would burn out its light ground; an exponent
 * lifts the dark and middle tones and leaves white where it is. It never darkens and stops at the limit.
 */
export function windowLiftExponent(luma: number): number {
  if (!(luma > 0) || luma >= WINDOW_TARGET_LUMA) return 1;
  return Math.max(WINDOW_LIFT_MIN_EXPONENT, Math.log(WINDOW_TARGET_LUMA) / Math.log(luma));
}
