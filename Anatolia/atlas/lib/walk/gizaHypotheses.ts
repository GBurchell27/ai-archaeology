/** The conjectural layer offered for Giza. It names whose reconstruction it is and what in it is this model's own. */

import { GIZA_SOURCES } from "./gizaLayout";
import type { HypothesisLayer } from "./hypothesisLayers";

export const GIZA_HYPOTHESES: readonly HypothesisLayer[] = [
  {
    id: "casing",
    label: "Casing and point as first built",
    note:
      "Petrie worked out each pyramid's first height from its casing base and the slope of the casing stones he found in place: about 146.7 m, 143.9 m and 65.1 m. " +
      "The smooth faces and points drawn are that reconstruction, see-through over the cores that stand. The points are computed, not measured; the two tones are this model's own, " +
      "the darker for the granite Petrie records on the lowest quarter of the third pyramid.",
    sources: [GIZA_SOURCES.khufu, GIZA_SOURCES.khafre, GIZA_SOURCES.menkaure],
  },
];
