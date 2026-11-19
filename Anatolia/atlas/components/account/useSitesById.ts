"use client";

import { useEffect, useState } from "react";
import type { PickedSite } from "@/lib/globe/siteBlock";
import { isAccountSiteId } from "@/lib/account/accountSiteId";
import { loadSiteOutsideCore, type WorldCatalogue } from "@/lib/world/catalogueLoader";
import { pickedSiteFromRow, rowOfSite } from "@/lib/world/sitePick";

async function findSite(catalogue: WorldCatalogue, siteId: string): Promise<PickedSite | null> {
  if (!isAccountSiteId(siteId)) return null;
  const row = rowOfSite(catalogue.core, siteId);
  return row !== null ? pickedSiteFromRow(catalogue, row) : loadSiteOutsideCore(catalogue, siteId);
}

/**
 * The catalogue's sites for a list of stored ids. An id the catalogue does not hold has no entry, which is how
 * a stored id that is not a published site never reaches the screen. Null while the lookup runs.
 */
export function useSitesById(catalogue: WorldCatalogue | null, siteIds: readonly string[]): ReadonlyMap<string, PickedSite> | null {
  const [found, setFound] = useState<{ key: string; sites: Map<string, PickedSite> } | null>(null);
  const key = siteIds.join(" ");
  useEffect(() => {
    if (!catalogue) return;
    let live = true;
    const ids = key ? key.split(" ") : [];
    void Promise.all(ids.map((siteId) => findSite(catalogue, siteId).catch(() => null))).then((sites) => {
      if (live) setFound({ key, sites: new Map(sites.filter((site) => site !== null).map((site) => [site.id, site])) });
    });
    return () => { live = false; };
  }, [catalogue, key]);
  return found?.key === key ? found.sites : null;
}
