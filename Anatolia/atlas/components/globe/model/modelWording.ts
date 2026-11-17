// Every word the recording-pattern layer says about itself, in one place, so the honesty of the
// wording can be reviewed without reading components. Never "predicted", never "discovery".

import type { PredictMetrics, PredictPeriod, PredictSiteClass } from "@/lib/world/predictIndex";

export const MODEL_STATEMENT =
  "A pattern in published records at about 28 km cells. Not a map of undiscovered sites. "
  + "Blank or low often means little survey, not absence. Only an archaeologist can confirm a site.";

export const MODEL_HEADING = "Where published sites tend to be recorded";

export const SITE_CLASS_LABEL: Record<PredictSiteClass, string> = {
  monument: "Monuments",
  settlement: "Settlements",
  funerary: "Burials",
  any: "Any kind",
};

export const PERIOD_LABEL: Record<PredictPeriod, string> = {
  "early-holocene": "10,000–5000 BCE",
  "mid-holocene": "5000–2000 BCE",
  "late-holocene": "2000 BCE–500 CE",
  all: "Any period",
};

export interface HonestyBadge {
  beatsBaseline: boolean;
  label: string;
  explanation: string;
}

export function honestyBadge(beatsBaseline: boolean): HonestyBadge {
  return beatsBaseline
    ? {
      beatsBaseline,
      label: "Beats the survey-effort baseline",
      explanation: "On regions held back from fitting, terrain and climate say more than survey density alone. Still a pattern in the record, not in the ground.",
    }
    : {
      beatsBaseline,
      label: "Mostly reflects where surveys were done",
      explanation: "On regions held back from fitting, this layer does no better than a baseline that only knows how densely an area is catalogued.",
    };
}

export const LEGEND_LOW = "less like documented places";
export const LEGEND_HIGH = "more like documented places";
export const NO_BASIS_LABEL = "No basis: too few published records nearby to say anything";
export const TOO_CLOSE_NOTE = "Hidden this close. A cell is about 28 km wide: zoom out to see the layer.";

export interface MetricReading {
  key: keyof PredictMetrics;
  label: string;
  value: string;
  explanation: string;
}

/** The four numbers worth showing, each with one plain sentence about what it means. */
export function metricReadings(metrics: PredictMetrics): MetricReading[] {
  return [
    {
      key: "auc",
      label: "Held-out AUC",
      value: metrics.auc.toFixed(2),
      explanation: "How often the layer ranks a cell with such a site above one without, on 5° blocks it never saw. 0.5 is a coin toss, 1 is perfect.",
    },
    {
      key: "effortNullAuc",
      label: "Effort baseline AUC",
      value: metrics.effortNullAuc.toFixed(2),
      explanation: "The same score for a baseline that knows only how densely an area is surveyed and catalogued. Within 0.02 of it counts as a tie.",
    },
    {
      key: "boyce",
      label: "Boyce index",
      value: metrics.boyce.toFixed(2),
      explanation: "Whether higher steps really hold more held-out sites, step after step. 1 is a steady rise, 0 no trend, below 0 backwards.",
    },
    {
      key: "gainTop10",
      label: "Gain at top 10%",
      value: metrics.gainTop10.toFixed(2),
      explanation: "One minus the top tenth's share of documented area over its share of held-out sites. 0 is chance; higher means more concentrated.",
    },
  ];
}
