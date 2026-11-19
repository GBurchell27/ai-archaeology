/** The modelled reconstructions a walk site can name. Add a layout file and a row here for another site. */

import type { WalkModel } from "./enclosureModel";
import { GIZA_MODEL } from "./gizaModel";
import { GOBEKLI_TEPE_MODEL } from "./gobekliTepeLayout";
import { KARAHAN_TEPE_MODEL } from "./karahanModel";
import type { WalkModelId, WalkSite } from "./walkSites";

const WALK_MODELS: Record<WalkModelId, WalkModel> = {
  "gobekli-tepe-enclosures": GOBEKLI_TEPE_MODEL,
  "karahan-tepe-structures": KARAHAN_TEPE_MODEL,
  "giza-pyramids": GIZA_MODEL,
};

export function findWalkModel(site: WalkSite): WalkModel | null {
  return site.modelId ? WALK_MODELS[site.modelId] : null;
}
