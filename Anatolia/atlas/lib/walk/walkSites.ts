/** Places that can be walked through: as a Gaussian splat built by scripts/splat (see its README), as a model, or both. */

export type SplatAlignment = {
  /** Metres, applied after rotation and scale, so the floor of the splat sits at y = 0. */
  position: [number, number, number];
  /** Euler XYZ in radians. The splat loader already turns y-down capture data upright, so this only levels it. */
  rotation: [number, number, number];
  /** Structure-from-motion has no absolute scale: this turns its units into metres. */
  scale: number;
};

/** Modelled reconstructions, held in walkModels.ts. */
export type WalkModelId = "gobekli-tepe-enclosures" | "karahan-tepe-structures" | "giza-pyramids";

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
  /** True for a site that has a model and no photographs: no splat is looked for and no choice of source is offered. */
  modelOnly?: boolean;
  /**
   * The world-catalogue ids of the globe cards that offer this walk. A site that has them is reached from the globe
   * and its exit returns there; a site without belongs to the Anatolia map.
   */
  globeCardIds?: readonly string[];
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
  // was taken, looking the way it looked; the radius of 36 m reaches every landmark placed in the photographs; the scale of 5.5 comes from the published spacing of Enclosures B, C and D and the height of Pillar 18.
  walkSite("gobekli-tepe", "Göbekli Tepe", 36, { position: [-0.93, 1.14, -17.21], rotation: [-0.593, -0.313, -0.157], scale: 5.5 }, "gobekli-tepe-enclosures"),
  // A fragment from 17 photographs. The walker starts where Gir_Ke_el3.jpg was taken; the scale is an estimate.
  // The radius and alignment are for that fragment: the model brings its own radius.
  walkSite("karahan-tepe", "Karahan Tepe", 25, { position: [-0.87, 1.79, -4.87], rotation: [-1.221, -1.146, -1.227], scale: 2 }, "karahan-tepe-structures"),
  // A model only. The id is the world-catalogue id of the pyramid complex, so the globe card, the reading list and the
  // questions are found under the id the walk has; the Great Pyramid's card offers the same walk. The radius is the model's.
  { ...walkSite("Q12508", "Giza pyramids", 820, UNTUNED_ALIGNMENT, "giza-pyramids"), modelOnly: true, globeCardIds: ["Q12508", "Q37200"] },
];

export function findWalkSite(id: string | undefined): WalkSite | null {
  return WALK_SITES.find((site) => site.id === id) ?? null;
}
