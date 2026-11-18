/** Places that can be walked through as a Gaussian splat. Built by scripts/splat (see its README). */

export type SplatAlignment = {
  /** Metres, applied after rotation and scale, so the floor of the splat sits at y = 0. */
  position: [number, number, number];
  /** Euler XYZ in radians. The splat loader already turns y-down capture data upright, so this only levels it. */
  rotation: [number, number, number];
  /** Structure-from-motion has no absolute scale: this turns its units into metres. */
  scale: number;
};

export type WalkSite = {
  id: string;
  name: string;
  splatUrl: string;
  creditsUrl: string;
  eyeHeightM: number;
  /** The walker stays within this distance of the origin. */
  walkRadiusM: number;
  alignment: SplatAlignment;
};

// shortcut: alignment is tuned by eye after each build, upgrade to surveyed control points if scale matters.
const UNTUNED_ALIGNMENT: SplatAlignment = { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 };

function walkSite(id: string, name: string, walkRadiusM: number, alignment = UNTUNED_ALIGNMENT): WalkSite {
  return {
    id,
    name,
    splatUrl: `/splats/${id}.splat`,
    creditsUrl: `/splats/${id}.credits.json`,
    eyeHeightM: 1.65,
    walkRadiusM,
    alignment,
  };
}

export const WALK_SITES: readonly WalkSite[] = [
  // Levelled from the photographers' average up direction. The walker starts where they stood, above the
  // enclosures; the scale of 3 is an estimate, not a measurement.
  walkSite("gobekli-tepe", "Göbekli Tepe", 25, { position: [-0.22, 1.68, 0.72], rotation: [-0.5284, -0.0151, 0.0559], scale: 3 }),
  walkSite("karahan-tepe", "Karahan Tepe", 25),
];

export function findWalkSite(id: string | undefined): WalkSite | null {
  return WALK_SITES.find((site) => site.id === id) ?? null;
}
