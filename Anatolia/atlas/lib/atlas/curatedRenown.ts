// How well known each curated Anatolia site is, read from the world catalogue. Pure, no DOM.
import { curatedMatcher, type CuratedCandidate } from "@/lib/atlas/curatedMatch";
import type { FeaturedSite, SiteColumns } from "@/lib/world/catalogueTypes";

/** A curated site as this ranking needs it: its names and where it is. */
export type RenownCandidate = CuratedCandidate;

export interface RenownSource {
  core: Pick<SiteColumns, "name" | "lon" | "lat" | "importance">;
  featured: readonly Pick<FeaturedSite, "name" | "lon" | "lat">[];
}

/** Above any sitelink count, so the catalogue's featured monuments come before every other site. */
const FEATURED_TIER = 10_000;

/**
 * A score per curated site id: the catalogue's featured monuments first, then by Wikidata sitelink count
 * (the catalogue's `importance`). A record counts for a site when it lies close by and shares one of its names.
 * A site with no such record, or only ones with no sitelinks, takes the best nearby record whose name
 * begins with one of its names ("Hacılar Mound" for Hacılar). A site the catalogue does not know scores 0. Nothing is moved or added:
 * the matching (`curatedMatch.ts`) only compares names and coordinates.
 */
export function curatedRenown(sites: readonly RenownCandidate[], source: RenownSource): Map<string, number> {
  const matcher = curatedMatcher(sites);
  const exact = new Map<string, number>();
  const loose = new Map<string, number>();
  const raise = (scores: Map<string, number>, matched: readonly RenownCandidate[], score: number) => {
    for (const site of matched) scores.set(site.id, Math.max(scores.get(site.id) ?? 0, score));
  };
  const credit = (name: string, lon: number, lat: number, score: number) => {
    raise(exact, matcher.exact({ name, lon, lat }), score);
    raise(loose, matcher.loose({ name, lon, lat }), score);
  };
  const { core } = source;
  core.name.forEach((name, row) => credit(name, core.lon[row], core.lat[row], core.importance[row]));
  const sitelinks = new Map(sites.map((site) => [site.id, exact.get(site.id) || loose.get(site.id) || 0]));
  // A featured monument keeps its sitelink count inside the tier, so the tier has an order of its own.
  exact.clear();
  loose.clear();
  for (const monument of source.featured) credit(monument.name, monument.lon, monument.lat, FEATURED_TIER);
  const renown = new Map<string, number>();
  for (const [id, links] of sitelinks) renown.set(id, (exact.has(id) || loose.has(id) ? FEATURED_TIER : 0) + links);
  return renown;
}
