import { pinsInRange, type YearRange } from "@/lib/timeline";
import type { SiteFeature } from "@/lib/types";
import type { WikiFeature } from "@/lib/wikidata";

export interface PlaceSearchResult {
  regionMatch: boolean;
  matches: SiteFeature[];
  wikiMatches: WikiFeature[];
}

export function searchKey(value: string): string {
  return value.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i");
}

export function searchPlaces(
  query: string,
  sites: SiteFeature[],
  wikiSites: WikiFeature[],
  range: YearRange,
  showUndated: boolean,
  regionName: string | null,
): PlaceSearchResult {
  const needle = searchKey(query);
  if (needle.length < 2) return { regionMatch: false, matches: [], wikiMatches: [] };
  const matches = sites.filter((site) => (
    site.properties.names.some((name) => searchKey(name).includes(needle))
  )).slice(0, 6);
  const wikiMatches = pinsInRange(
    wikiSites.filter((site) => searchKey(site.properties.name).includes(needle)),
    range,
    showUndated,
  ).slice(0, 4);
  return { regionMatch: regionName != null && searchKey(regionName).includes(needle), matches, wikiMatches };
}
