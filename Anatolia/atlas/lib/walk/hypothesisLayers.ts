/**
 * Conjectural layers a modelled reconstruction can offer: what the place might have looked like, never what was found.
 * A model lists the layers it supports; the scene knows how to draw each id.
 */

import type { ModelSource } from "./enclosureModel";

export type HypothesisLayerId = "roofs" | "surroundings";

export type HypothesisLayer = {
  id: HypothesisLayerId;
  label: string;
  /** One line: whose hypothesis this is and how contested. */
  note: string;
  sources: readonly ModelSource[];
};

export const HYPOTHESIS_STANDING_NOTE = "These layers are hypotheses drawn for comparison. They are not findings.";

export function toggledLayers(active: readonly HypothesisLayerId[], id: HypothesisLayerId): HypothesisLayerId[] {
  return active.includes(id) ? active.filter((other) => other !== id) : [...active, id];
}

/** The sentence the footer adds while any layer is on, or an empty string. */
export function hypothesisFootnote(layers: readonly HypothesisLayer[], active: readonly HypothesisLayerId[]): string {
  const shown = layers.filter((layer) => active.includes(layer.id)).map((layer) => layer.label.toLowerCase());
  return shown.length === 0 ? "" : `Also shown: ${shown.join(" and ")}. That is conjecture, not something excavated.`;
}
