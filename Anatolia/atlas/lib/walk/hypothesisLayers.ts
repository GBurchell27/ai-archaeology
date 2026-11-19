/**
 * Conjectural layers a modelled reconstruction can offer: what the place might have looked like, never what was found.
 * A model lists the layers it supports; the scene knows how to draw each id.
 */

import type { ModelSource } from "./enclosureModel";

export type HypothesisLayerId = "roofs" | "surroundings" | "backfill";

/** A place to stand and a point to look at, in walk metres from the walker's start. Only a camera position, never a find. */
export type LayerViewpoint = {
  standAt: readonly [x: number, z: number];
  lookAt: readonly [x: number, y: number, z: number];
};

export type HypothesisLayer = {
  id: HypothesisLayerId;
  label: string;
  /** One line: whose hypothesis this is and how contested. */
  note: string;
  sources: readonly ModelSource[];
  /** Which part of the model the layer changes, for a layer that does not show everywhere. */
  where?: string;
  /** Where to stand to see it, for a layer that is out of sight from the walker's start. */
  viewpoint?: LayerViewpoint;
};

export const HYPOTHESIS_STANDING_NOTE = "These layers are hypotheses drawn for comparison. They are not findings.";

export function toggledLayers(active: readonly HypothesisLayerId[], id: HypothesisLayerId): HypothesisLayerId[] {
  return active.includes(id) ? active.filter((other) => other !== id) : [...active, id];
}

/** The sentence the footer adds while any layer is on, or an empty string. */
export function hypothesisFootnote(layers: readonly HypothesisLayer[], active: readonly HypothesisLayerId[]): string {
  const shown = layers.filter((layer) => active.includes(layer.id)).map((layer) => layer.label);
  return shown.length === 0 ? "" : `Hypothesis layers shown: ${shown.join("; ")}. They are conjecture, not something excavated.`;
}
