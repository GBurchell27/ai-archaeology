// Period colours for the Anatolia atlas: pins, the legend, the layer switches and the occupation bar.
// On this map colour means period, and the hues are the globe's families so both views read as one atlas.

import { SITE_PALETTE } from "@/lib/world/siteTypeStyle";
import type { LayerId } from "@/lib/types";

export const LAYER_STYLE: Record<LayerId, { title: string; color: string }> = {
  neolithic: { title: "Neolithic", color: SITE_PALETTE.EMBER },
  bronze: { title: "Bronze & Iron", color: SITE_PALETTE.AMBER },
  classical: { title: "Classical & Byzantine", color: SITE_PALETTE.ROSE },
  crusader: { title: "Crusader era", color: SITE_PALETTE.VERDIGRIS },
};

/** A catalogue place whose record names none of the periods above. */
export const NO_PERIOD_STYLE = { title: "no period given", color: SITE_PALETTE.STONE_GOLD };

export function periodColor(periodId: string | undefined): string {
  return (periodId && LAYER_STYLE[periodId as LayerId]?.color) || NO_PERIOD_STYLE.color;
}
