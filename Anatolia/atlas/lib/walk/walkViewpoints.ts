/** The training camera positions of each walk site's splat. Export a table and add a row here for another site. */

import { GOBEKLI_TEPE_VIEWPOINTS } from "./gobekliTepeViewpoints";
import { KARAHAN_TEPE_VIEWPOINTS } from "./karahanTepeViewpoints";
import type { PhotoViewpoint } from "./photoViewpoints";

const SITE_VIEWPOINTS: Readonly<Record<string, readonly PhotoViewpoint[]>> = {
  "gobekli-tepe": GOBEKLI_TEPE_VIEWPOINTS,
  "karahan-tepe": KARAHAN_TEPE_VIEWPOINTS,
};

const NO_VIEWPOINTS: readonly PhotoViewpoint[] = [];

/** The viewpoints of a site's photographs, or none when its cameras have not been exported. */
export function photoViewpoints(siteId: string): readonly PhotoViewpoint[] {
  return SITE_VIEWPOINTS[siteId] ?? NO_VIEWPOINTS;
}
