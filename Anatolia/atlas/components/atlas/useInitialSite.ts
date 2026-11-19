import { useEffect, useState } from "react";
import { curatedCandidate, curatedSiteForRecord, type CatalogueRecordPlace } from "@/lib/atlas/curatedMatch";
import type { SiteFeature } from "@/lib/types";
import type { WikiFeature } from "@/lib/wikidata";
import { loadSiteDetail } from "@/lib/world/catalogueLoader";

export interface InitialSiteSources {
  sites: SiteFeature[];
  wikiSites: WikiFeature[];
  /** True once the atlas's own catalogue has arrived or failed, so "not in it" can be told from "not yet". */
  wikiLoaded: boolean;
}

/** The world-catalogue record of an id, asked for only when `wanted`: undefined while unknown, null when there is none. */
function useCatalogueRecord(id: string | undefined, wanted: boolean): CatalogueRecordPlace | null | undefined {
  const [record, setRecord] = useState<CatalogueRecordPlace | null | undefined>(undefined);
  useEffect(() => {
    if (!id || !wanted) return undefined;
    let live = true;
    void loadSiteDetail(id).then((detail) => live && setRecord(detail));
    return () => {
      live = false;
    };
  }, [id, wanted]);
  return record;
}

/**
 * Opens the place the atlas was asked to start on, once its record has loaded and the camera is in place (`ready`).
 * A curated id wins, then a place of the atlas's own catalogue. Any other id is looked up in the world catalogue
 * (the globe's cards carry those) and opens the curated site that record stands for, if there is one.
 * Returns true once that is decided, whether or not anything opened.
 */
export function useInitialSite(
  initialSiteId: string | undefined,
  ready: boolean,
  { sites, wikiSites, wikiLoaded }: InitialSiteSources,
  flyTo: (site: SiteFeature) => void,
  openWiki: (site: WikiFeature) => void,
): boolean {
  const [settled, setSettled] = useState(!initialSiteId);
  const curated = sites.find((item) => item.id === initialSiteId);
  const record = useCatalogueRecord(initialSiteId, ready && !curated);
  useEffect(() => {
    if (settled || !ready) return;
    const wiki = curated ? undefined : wikiSites.find((item) => item.id === initialSiteId);
    // A place of the atlas's own catalogue keeps its own dot, so the match waits until that catalogue has answered.
    if (!curated && !wiki && (!wikiLoaded || record === undefined)) return;
    const matchId = !curated && !wiki && record ? curatedSiteForRecord(sites.map(curatedCandidate), record) : null;
    const site = curated ?? sites.find((item) => item.id === matchId);
    if (site) flyTo(site);
    else if (wiki) openWiki(wiki);
    setSettled(true);
    // flyTo and openWiki are rebuilt every render; this must run only when the records appear.
  }, [settled, ready, curated, record, wikiSites, wikiLoaded]);
  return settled;
}
