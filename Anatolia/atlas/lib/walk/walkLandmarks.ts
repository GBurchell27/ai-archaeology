/** The landmarks of each walk site. Add a landmark file and a row here for another site. */

import type { WalkModel } from "./enclosureModel";
import { GIZA_LANDMARKS } from "./gizaLandmarks";
import { GOBEKLI_TEPE_LANDMARKS } from "./gobekliTepeLandmarks";
import { KARAHAN_TEPE_LANDMARKS } from "./karahanTepeLandmarks";
import { placeOnModel, placeOnPhotographs, type PlacedLandmark, type SiteLandmarks } from "./landmarks";

const SITE_LANDMARKS: Readonly<Record<string, SiteLandmarks>> = {
  "gobekli-tepe": GOBEKLI_TEPE_LANDMARKS,
  "karahan-tepe": KARAHAN_TEPE_LANDMARKS,
  Q12508: GIZA_LANDMARKS,
};

/** The landmarks of a site placed for the source on screen: the model when one is given, else the photographs. */
export function placedLandmarks(siteId: string, model: WalkModel | null): PlacedLandmark[] {
  const siteLandmarks = SITE_LANDMARKS[siteId];
  if (!siteLandmarks) return [];
  return model ? placeOnModel(siteLandmarks.landmarks, model) : placeOnPhotographs(siteLandmarks);
}
