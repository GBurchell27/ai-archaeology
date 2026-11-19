import { useMemo } from "react";
import { curatedCandidate } from "@/lib/atlas/curatedMatch";
import { curatedRenown } from "@/lib/atlas/curatedRenown";
import type { SiteFeature } from "@/lib/types";
import { useWorldCatalogue } from "@/lib/world/catalogueLoader";

const UNRANKED: ReadonlyMap<string, number> = new Map();
/** The map is ready without the ranking, so the catalogue is asked for once the map's own files have had time to arrive. */
const CATALOGUE_DEFER_MS = 2500;

/**
 * How well known each curated site is, by id, from the world catalogue the globe already loads.
 * Empty until that catalogue arrives, and for good if it cannot be read: the sites then keep their file order.
 * Coming from the globe the catalogue is already loaded; opened directly, the atlas asks for it a moment after it is ready.
 */
export function useCuratedRenown(sites: readonly SiteFeature[]): ReadonlyMap<string, number> {
  const { catalogue } = useWorldCatalogue(CATALOGUE_DEFER_MS);
  return useMemo(() => {
    if (!catalogue) return UNRANKED;
    return curatedRenown(sites.map(curatedCandidate), catalogue);
  }, [sites, catalogue]);
}
