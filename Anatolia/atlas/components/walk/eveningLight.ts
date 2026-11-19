import { Vector3 } from "three";
import { BUILDING_SCALE } from "@/lib/walk/walkScale";

const fromCompass = (east: number, up: number, south: number) => new Vector3(east, up, south).normalize();

/** A low evening sun in the south-west, behind the walker's left shoulder at the start. */
const SUN_DIRECTION = fromCompass(-0.72, 0.42, 0.55);

/**
 * The one light setup both walk models stand in: a warm low sun as the key, and three shadowless fills that stand in
 * for the sky, so that limestone in shade stays pale and a little warm, and still shows which way each face looks.
 * Change the mood here, not in the materials.
 */
export const EVENING_LIGHT = {
  /** The key, and the only light that casts shadows. */
  sun: { direction: SUN_DIRECTION, colour: "#ffdcb2", intensity: 3.4 },
  /** Light from the whole sky, and what the sunlit earth throws back up: warm sand, but too pale to stain an underside. */
  skyFill: { skyColour: "#b6bccc", groundColour: "#bba88e", intensity: 1.2 },
  /** The bright sky around the sun, which reaches over a wall into the shade behind it. */
  sunGlow: { direction: fromCompass(-0.5, 0.78, 0.38), colour: "#ffd3ac", intensity: 0.65 },
  /** The blue sky opposite the sun, on the faces turned away from it. */
  farSky: { direction: fromCompass(0.66, 0.5, -0.56), colour: "#aab2c8", intensity: 0.5 },
  /** Haze thickens from `nearM` to the far hills. Its colour is the horizon's, between the gold side and the dusk side. */
  haze: { colour: "#857a72", nearM: 45, farM: 320 },
  hillColour: "#3b393d",
  /** How far a hill pales into the haze at its foot, and how much of the sunset its crest and its foot take on the side of the sun. */
  hillHaze: { atFoot: 0.3, sunsetOnCrest: 0.04, sunsetAtFoot: 0.18 },
} as const;

/** The sky dome, as display colours: deep blue overhead, dusk along the horizon, gold toward the sun. */
export const EVENING_SKY = {
  zenith: "#16203c",
  horizonAway: "#6f6a78",
  horizonSunward: "#e8ad6c",
  /** Added around the sun, falling away smoothly with the angle from it. */
  glow: "#d98a48",
  sunDisc: "#fff0cf",
  /** The disc is drawn larger than the real sun and fades out between these angles from its centre, in radians. */
  sunDiscRad: { full: 0.016, gone: 0.034 },
} as const;

/**
 * The sun's one shadow map, seen from `distanceM` up the sun's ray. It covers the ground out to `reachM` from the
 * origin across the light and along it; seen down a low ray that ground is a flat rectangle, so the map is one too.
 * Nothing in a model moves, so the map is drawn once and again only when a layer is switched.
 */
export const SUN_SHADOW = {
  reachM: BUILDING_SCALE.shadowReachM,
  /** Across the light. The map's other side is this times the sine of the sun's height, which keeps its texels square. */
  mapPx: 4096,
  distanceM: 150,
  bias: -0.0004,
  normalBias: 0.08,
} as const;

/**
 * The same map stretched to reach `reachM`, for a site far larger than a building. Its texels grow with it, so the
 * offset that keeps a lit face out of its own shadow grows too. At the reach above it is the map above.
 */
export function sunShadowReaching(reachM: number) {
  const stretch = reachM / SUN_SHADOW.reachM;
  return { ...SUN_SHADOW, reachM, distanceM: SUN_SHADOW.distanceM * stretch, normalBias: SUN_SHADOW.normalBias * stretch };
}
