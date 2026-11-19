// Every word the ice and sea level layer says about itself, in one place, so the honesty of the
// wording can be reviewed without reading components. Never "coastline", never "was": it is a model.

import { formatYear } from "@/lib/periods";
import type { PaleoStep } from "@/lib/world/paleoIndex";

export const PALEO_HEADING = "Ice and sea level";
export const PALEO_KICKER = "Context layer · a model, not a coastline";
export const PALEO_NOTHING_DRAWN = "Nothing differs from today, so nothing is drawn.";
export const PALEO_DRAWN = "Ice since melted, and land where the sea is today, as the model has them.";

export const PALEO_STATEMENT =
  "A modelled reconstruction at about 28 km cells, in 500-year steps back to 20,000 BCE. Not a map of any coastline: "
  + "it cannot show the shore near a site. It draws only what differs from today: ice standing at least 150 m above "
  + "today's surface, and land where the sea is today. It gives no sea level figure, because the source publishes none. "
  + "The source lowers one global sea level per step, with no rise or sinking of the land, and has nothing north of 84°N.";

export const PALEO_TIMELINE_NOTE =
  "It shows the step nearest the middle of the years picked on the timeline. With the timeline on all time it is at "
  + "the present day and draws nothing. The timeline starts at 12,000 BCE, so earlier steps are picked here.";

export const PALEO_SOURCE_NOTE =
  "The ice is the ICE-6G_C model (Peltier and others 2015) as CHELSA-TraCE21k interpolated it, with glacier outlines added; "
  + "other reconstructions draw the ice margins and the shores differently.";

export const FOLLOW_TIMELINE_LABEL = "Follow the timeline";
export const LEGEND_ICE = "Ice in the model that has since melted or thinned";
export const LEGEND_EXPOSED_LAND = "Land in the model where the sea is today";
export const PALEO_TOO_CLOSE_NOTE = "Hidden this close: a cell is about 28 km wide. Zoom out to see it.";

const CURRENT_YEAR = 2000;
const count = (value: number) => value.toLocaleString("en-GB");

/** "10,500 BCE", or "the present day" for the last step. */
export function paleoStepLabel(step: PaleoStep, present: PaleoStep): string {
  if (step.year === present.year) return "the present day";
  return formatYear(step.year).replace(/\d{5,}/, (digits) => count(Number(digits)));
}

/** "about 12,500 years ago"; empty for the present day. */
export function paleoYearsAgo(step: PaleoStep, present: PaleoStep): string {
  return step.year === present.year ? "" : `about ${count(CURRENT_YEAR - step.year)} years ago`;
}

/** The one line that says what is on the globe now. */
export function paleoReadout(step: PaleoStep, present: PaleoStep): string {
  if (step.year === present.year) return `The model at the present day. ${PALEO_NOTHING_DRAWN}`;
  return `The model at ${[paleoStepLabel(step, present), paleoYearsAgo(step, present)].join(", ")}.`;
}
