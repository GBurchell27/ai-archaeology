"use client";

import { useMemo } from "react";
import type { WorldCatalogue } from "@/lib/world/catalogueLoader";
import { pickedSiteFromNames, pickedSiteFromRow } from "@/lib/world/sitePick";
import { searchSiteIndexes, type SiteSearchIndex } from "@/lib/world/siteSearch";
import type { PickedSite } from "../GlobeSites";
import { useSiteNames, useSiteSearchIndex } from "./useSiteSearchIndex";

const isWhole = (index: SiteSearchIndex | null) => index !== null && index.foldedRows === index.folded.length;

/**
 * The sites a query finds across the whole catalogue: the core file at once, everything else from
 * the names file, which is fetched only once `wholeCatalogue` turns true (the search box was focused).
 * `stillReading` is true while more names are on their way, so an empty list is not yet a "no".
 */
export function useSiteSearchHits(
  catalogue: WorldCatalogue | null,
  query: string,
  wholeCatalogue: boolean,
): { hits: PickedSite[]; stillReading: boolean } {
  const core = useSiteSearchIndex(catalogue?.core ?? null);
  const { names, settled } = useSiteNames(catalogue?.index.namesFile, wholeCatalogue && catalogue !== null);
  const rest = useSiteSearchIndex(names);

  // The foldedRows counts are dependencies so results fill in while the indexes are still being built.
  const hits = useMemo(() => {
    if (!core.index || !catalogue) return [];
    const indexes = rest.index && names ? [core.index, rest.index] : [core.index];
    return searchSiteIndexes(indexes, query).map((hit) => (
      hit.index === 0 ? pickedSiteFromRow(catalogue, hit.row) : pickedSiteFromNames(names!, hit.row, catalogue.index.siteTypes)
    ));
  }, [core.index, core.foldedRows, rest.index, rest.foldedRows, names, catalogue, query]); // eslint-disable-line react-hooks/exhaustive-deps

  const stillReading = !isWhole(core.index) || !settled || (names !== null && !isWhole(rest.index));
  return { hits, stillReading };
}
