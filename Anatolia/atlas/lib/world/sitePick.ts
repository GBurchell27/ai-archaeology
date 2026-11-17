// Turning catalogue rows into the picked-site shape the globe chrome works with, and where the camera goes for one.

import type { PickedSite } from "@/lib/globe/siteBlock";
import type { GlobeLook } from "@/lib/globe/ellipsoid";
import { ENTER_ATLAS_ALTITUDE, isInsideAtlasBounds } from "@/lib/globe/handoff";
import type { WorldCatalogue } from "./catalogueLoader";
import type { NameColumns, SiteColumns, SiteDetail, WorldIndex } from "./catalogueTypes";

const ARRIVAL_ALTITUDE = 1_400_000;
const CLOSER_ALTITUDE = 220_000;
/** A flight that ends below the handoff line over Turkey would bounce straight into the terrain atlas. */
const LOWEST_OVER_ATLAS = ENTER_ATLAS_ALTITUDE + 60_000;

/** The id patterns of the three sources are disjoint, so the id alone says whose record it is. */
function sourceOfSiteId(id: string): string {
  return id.startsWith("osm-") ? "osm" : /^Q\d+$/.test(id) ? "wikidata" : "pleiades";
}

/** A row of any column block (core, a regional cell, the OpenStreetMap layer) as a picked site. */
export function pickedSiteFromColumns(columns: SiteColumns, row: number, index: WorldIndex): PickedSite {
  return {
    id: columns.id[row],
    name: columns.name[row],
    lon: columns.lon[row],
    lat: columns.lat[row],
    siteType: index.siteTypes[columns.type[row]] ?? "other",
    startYear: columns.start[row],
    endYear: columns.end[row],
    featured: columns.featured[row] === 1,
    source: index.sources[columns.source[row]]?.id ?? sourceOfSiteId(columns.id[row]),
  };
}

export function pickedSiteFromRow(catalogue: WorldCatalogue, row: number): PickedSite {
  return pickedSiteFromColumns(catalogue.core, row, catalogue.index);
}

/** Last resort for a site whose own row cannot be read: the detail record knows where it is, not its type or dates. */
export function pickedSiteFromDetail(id: string, detail: SiteDetail): PickedSite {
  return {
    id, name: detail.name, lon: detail.lon, lat: detail.lat, siteType: "other",
    startYear: null, endYear: null, featured: false, source: sourceOfSiteId(id),
  };
}

/** A search hit from the names file: enough to open the card before the site's own cell has loaded. */
export function pickedSiteFromNames(names: NameColumns, row: number, siteTypes: string[]): PickedSite {
  return {
    id: names.id[row], name: names.name[row], lon: names.lon[row], lat: names.lat[row],
    siteType: siteTypes[names.type[row]] ?? "other",
    startYear: names.start[row], endYear: names.end[row], featured: false, source: sourceOfSiteId(names.id[row]),
  };
}

const rowIndexes = new WeakMap<SiteColumns, Map<string, number>>();

export function rowOfSite(columns: SiteColumns, id: string): number | null {
  let rows = rowIndexes.get(columns);
  if (!rows) {
    rows = new Map(columns.id.map((siteId, row) => [siteId, row]));
    rowIndexes.set(columns, rows);
  }
  return rows.get(id) ?? null;
}

export function isSiteInAtlas(site: { lon: number; lat: number }): boolean {
  return isInsideAtlasBounds({ longitude: site.lon, latitude: site.lat });
}

/** Where a flight to a site ends: no higher than a regional view, never zooming the user back out. */
export function siteArrivalLook(site: { lon: number; lat: number }, currentAltitude: number, closer = false): GlobeLook {
  const wanted = closer ? CLOSER_ALTITUDE : Math.min(ARRIVAL_ALTITUDE, currentAltitude);
  const altitude = isSiteInAtlas(site) ? Math.max(wanted, LOWEST_OVER_ATLAS) : wanted;
  return { longitude: site.lon, latitude: site.lat, altitude };
}
