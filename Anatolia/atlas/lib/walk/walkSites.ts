/** Places that can be walked through as a Gaussian splat. Built by scripts/splat (see its README). */

export type SplatAlignment = {
  /** Metres, applied after rotation and scale, so the floor of the splat sits at y = 0. */
  position: [number, number, number];
  /** Euler XYZ in radians. The splat loader already turns y-down capture data upright, so this only levels it. */
  rotation: [number, number, number];
  /** Structure-from-motion has no absolute scale: this turns its units into metres. */
  scale: number;
};

/** Modelled reconstructions, held in walkModels.ts. */
export type WalkModelId = "gobekli-tepe-enclosures";

export type WalkSite = {
  id: string;
  name: string;
  splatUrl: string;
  creditsUrl: string;
  eyeHeightM: number;
  /** The walker stays within this distance of the origin. */
  walkRadiusM: number;
  alignment: SplatAlignment;
  /** Present when the site also has a modelled reconstruction, which the walk then opens first. */
  modelId?: WalkModelId;
};

// shortcut: alignment is tuned by eye after each build, upgrade to surveyed control points if scale matters.
const UNTUNED_ALIGNMENT: SplatAlignment = { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 };

function walkSite(id: string, name: string, walkRadiusM: number, alignment = UNTUNED_ALIGNMENT, modelId?: WalkModelId): WalkSite {
  return {
    id,
    name,
    splatUrl: `/splats/${id}.splat`,
    creditsUrl: `/splats/${id}.credits.json`,
    eyeHeightM: 1.65,
    walkRadiusM,
    alignment,
    modelId,
  };
}

export const WALK_SITES: readonly WalkSite[] = [
  // Levelled from the photographers' cameras. The walker starts on the visitor walkway where one wide photograph
  // was taken, looking the way it looked; the scale of 4.5 is an estimate from the depth of the enclosures.
  walkSite("gobekli-tepe", "Göbekli Tepe", 25, { position: [-0.76, 1.23, -14.08], rotation: [-0.593, -0.313, -0.157], scale: 4.5 }, "gobekli-tepe-enclosures"),
  // A fragment from 11 photographs. The walker starts where Gir_Ke_el3.jpg was taken; the scale is an estimate.
  walkSite("karahan-tepe", "Karahan Tepe", 25, { position: [-0.81, 1.47, -4.46], rotation: [-1.828, -1.287, -1.837], scale: 1.5 }),
];

export function findWalkSite(id: string | undefined): WalkSite | null {
  return WALK_SITES.find((site) => site.id === id) ?? null;
}
