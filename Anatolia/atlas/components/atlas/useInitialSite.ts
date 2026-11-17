import { useEffect, useRef } from "react";
import type { SiteFeature } from "@/lib/types";
import type { WikiFeature } from "@/lib/wikidata";

/** Opens the place the atlas was asked to start on, once its record has loaded and the camera is in place (`ready`).
 *  A curated site wins; a catalogue place opens when the catalogue arrives. */
export function useInitialSite(
  initialSiteId: string | undefined,
  ready: boolean,
  sites: SiteFeature[],
  wikiSites: WikiFeature[],
  flyTo: (site: SiteFeature) => void,
  openWiki: (site: WikiFeature) => void,
): void {
  const openedId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!initialSiteId || !ready || openedId.current === initialSiteId) return;
    const site = sites.find((item) => item.id === initialSiteId);
    const wiki = site ? undefined : wikiSites.find((item) => item.id === initialSiteId);
    if (!site && !wiki) return;
    openedId.current = initialSiteId;
    if (site) flyTo(site);
    else if (wiki) openWiki(wiki);
    // flyTo and openWiki are rebuilt every render; this must run only when the record appears.
  }, [initialSiteId, ready, sites, wikiSites]);
}
