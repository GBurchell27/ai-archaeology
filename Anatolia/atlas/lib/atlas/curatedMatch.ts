// Which curated Anatolia site a world-catalogue record stands for, by name and proximity. Pure, no DOM.
import { searchKey } from "@/lib/search";
import type { SiteFeature } from "@/lib/types";

/** A curated site as the matching needs it: its names and where it is. */
export interface CuratedCandidate {
  id: string;
  names: readonly string[];
  longitude: number;
  latitude: number;
}

export function curatedCandidate(site: SiteFeature): CuratedCandidate {
  return {
    id: site.id,
    names: [site.properties.name, ...site.properties.names],
    longitude: site.geometry.coordinates[0],
    latitude: site.geometry.coordinates[1],
  };
}

/** A catalogue record as the matching needs it. */
export interface CatalogueRecordPlace {
  name: string;
  lon: number;
  lat: number;
}

/** A catalogue record is the same place when it shares a name and lies this close, in degrees. */
const SAME_PLACE_DEGREES = 0.3;

/**
 * The names one catalogue record goes by. A Pleiades title may hold several, as in "Tarsus/Antiochia ad Cydnum",
 * and marks doubt with "?" or "*"; each part is a name already in the data, none is made up here.
 */
function recordNames(name: string): string[] {
  return name.split("/").map((part) => searchKey(part.replace(/[?*]/g, ""))).filter(Boolean);
}

/** The leading words of a name, shortest first: "goreme national park" gives "goreme" and "goreme national". */
function leadingWords(key: string): string[] {
  const words = key.split(" ");
  return words.slice(1).map((_, count) => words.slice(0, count + 1).join(" "));
}

export interface CuratedMatcher {
  /** The curated sites close to the record that share one of its names. */
  exact(record: CatalogueRecordPlace): CuratedCandidate[];
  /** The curated sites close to the record whose name the record's name begins with ("Hacılar Mound" for Hacılar). */
  loose(record: CatalogueRecordPlace): CuratedCandidate[];
}

/** Coordinates are only compared, so that Antioch on the Orontes is not taken for another Antioch. */
export function curatedMatcher(sites: readonly CuratedCandidate[]): CuratedMatcher {
  const sitesByName = new Map<string, CuratedCandidate[]>();
  for (const site of sites) {
    for (const name of site.names) {
      const key = searchKey(name);
      sitesByName.set(key, [...(sitesByName.get(key) ?? []), site]);
    }
  }
  const near = (key: string, { lon, lat }: CatalogueRecordPlace) => (sitesByName.get(key) ?? []).filter(
    (site) => Math.abs(site.longitude - lon) <= SAME_PLACE_DEGREES && Math.abs(site.latitude - lat) <= SAME_PLACE_DEGREES,
  );
  return {
    exact: (record) => recordNames(record.name).flatMap((key) => near(key, record)),
    loose: (record) => recordNames(record.name).flatMap((key) => leadingWords(key).flatMap((start) => near(start, record))),
  };
}

function nearestId(sites: readonly CuratedCandidate[], { lon, lat }: CatalogueRecordPlace): string | null {
  const distance = (site: CuratedCandidate) => Math.hypot(site.longitude - lon, site.latitude - lat);
  return sites.reduce<CuratedCandidate | null>((best, site) => (best && distance(best) <= distance(site) ? best : site), null)?.id ?? null;
}

/**
 * The id of the curated site a catalogue record stands for: the nearest that shares a name with it, failing that the nearest
 * whose name the record's name begins with, else null. Nothing is moved or added: the record only picks a site that already exists.
 */
export function curatedSiteForRecord(sites: readonly CuratedCandidate[], record: CatalogueRecordPlace): string | null {
  const matcher = curatedMatcher(sites);
  return nearestId(matcher.exact(record), record) ?? nearestId(matcher.loose(record), record);
}
