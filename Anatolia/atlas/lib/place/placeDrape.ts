/** What is laid over the relief, and how hard the movable sun shades it. */
export interface Drape {
  label: string;
  part: "satellite" | "hillshade";
  /** Share of the image in the surface colour; the rest is a neutral clay. */
  imageShare: number;
  /** Light that reaches every slope. Low values let the sun rake. */
  ambient: number;
}

export const DRAPES = {
  satellite: { label: "Satellite", part: "satellite", imageShare: 1, ambient: 0.74 },
  hillshade: { label: "Hillshade", part: "hillshade", imageShare: 0.2, ambient: 0.1 },
  blend: { label: "Satellite + sun", part: "satellite", imageShare: 1, ambient: 0.3 },
} as const satisfies Record<string, Drape>;

export type DrapeId = keyof typeof DRAPES;
export const DRAPE_IDS = Object.keys(DRAPES) as DrapeId[];

export const SUN_ALTITUDE_DEGREES = 15;
export const DEFAULT_SUN_AZIMUTH = 315;

const COMPASS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];

export function compassPoint(azimuthDegrees: number): string {
  return COMPASS[Math.round((((azimuthDegrees % 360) + 360) % 360) / 45) % 8];
}
