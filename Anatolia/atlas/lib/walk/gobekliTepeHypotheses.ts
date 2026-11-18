/** The conjectural layers offered for Göbekli Tepe. Each names whose hypothesis it is and how far it is disputed. */

import type { HypothesisLayer } from "./hypothesisLayers";

export const GOBEKLI_TEPE_HYPOTHESES: readonly HypothesisLayer[] = [
  {
    id: "roofs",
    label: "Roofs",
    note:
      "Kurapkat's architectural study and Banning argue the buildings were roofed; Schmidt saw open-air enclosures and called the question unanswered. " +
      "No roof remains were found. The timber frame and translucent cover drawn here are this model's own simplification, not a published reconstruction.",
    sources: [
      { label: "Kurapkat 2012, A Roof under One's Feet", url: "https://structurae.net/en/literature/conference-paper/roof-under-one-s-feet-early-neolithic-roof-constructions-at-gobekli-tepe-southeastern-turkey" },
      { label: "Banning 2011, So Fair a House", url: "https://doi.org/10.1086/661207" },
      { label: "Schmidt 2010", url: "https://doi.org/10.4312/dp.37.21" },
    ],
  },
  {
    id: "surroundings",
    label: "Surroundings about 9500 BCE",
    note:
      "From charcoal and seeds Neef reconstructs an open forest-steppe: widely spaced wild pistachio and almond over grass with wild cereals. " +
      "Peters and Schmidt read the animal bones the same way. Where each tree stood is invented, and the limestone plateaus beside the mound were probably as bare as today (Dietrich et al. 2019).",
    sources: [
      { label: "Neef 2003, Neo-Lithics 2/03", url: "https://www.exoriente.org/repository/NEO-LITHICS/NEO-LITHICS_2003_2.pdf" },
      { label: "Peters & Schmidt 2004", url: "https://sciencepress.mnhn.fr/sites/default/files/articles/pdf/az2004n1a13.pdf" },
      { label: "Dietrich et al. 2019", url: "https://doi.org/10.1371/journal.pone.0215214" },
    ],
  },
];
