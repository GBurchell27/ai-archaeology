// The one colour ramp of the recording-pattern layer, shared by the globe shader and the legend.
// Ten decile steps, dark to light, in a cool blue-to-ice family: lightness carries the order (so it
// survives colour-blindness and greyscale) and the hue stays far from the warm ochre of the site points.
// Built in OKLCH: lightness 0.30 → 0.94 in even steps, hue 272° → 190°.

export const MODEL_RAMP: readonly string[] = [
  "#252c47", "#283f6b", "#23548c", "#146ca7", "#0086bb",
  "#209fc8", "#4eb6d1", "#7fcbd7", "#aedee0", "#c6f7f2",
];

/** Raster values (Contract 4). */
export const RASTER_OCEAN = 0;
export const RASTER_NO_BASIS = 255;

/** "No basis" is drawn as a neutral hatch, never as a ramp colour. */
export const NO_BASIS_HATCH = { line: "#c3c9d1", spacingPx: 6, lineAlpha: 0.2, veilAlpha: 0.42 };

/** "#rrggbb" → sRGB components in 0–1. */
export function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

/** OKLab lightness (0 black – 1 white) of an sRGB colour: the quantity the ramp must rise in. */
export function oklabLightness(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  const long = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const medium = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const short = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return 0.2104542553 * long + 0.793617785 * medium - 0.0040720468 * short;
}
