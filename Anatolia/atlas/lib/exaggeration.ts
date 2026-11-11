/**
 * Vertical metres drawn per ground metre.
 * A 10 km window (about 40 m cells) stays near 1.5–2×. The national mosaic is
 * much coarser, so it keeps enough relief to read from the overview camera.
 */
export function naturalExaggeration(pixelSizeMetres: number): number {
  if (pixelSizeMetres > 200) {
    return 6.5;
  }
  const scaled = 1.75 * Math.sqrt(pixelSizeMetres / 40);
  return Math.round(Math.min(2, Math.max(1.5, scaled)) * 10) / 10;
}
