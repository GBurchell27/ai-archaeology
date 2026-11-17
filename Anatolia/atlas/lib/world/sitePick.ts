// Turning catalogue rows into the picked-site shape the globe chrome works with, and where the camera goes for one.

import type { PickedSite } from "@/lib/globe/siteBlock";
import type { GlobeLook } from "@/lib/globe/ellipsoid";
import { ENTER_ATLAS_ALTITUDE, isInsideAtlasBounds } from "@/lib/globe/handoff";
import type { WorldCatalogue } from "./catalogueLoader";
import type { SiteColumns, SiteDetail } from "./catalogueTypes";

const ARRIVAL_ALTITUDE = 1_400_000;
const CLOSER_ALTITUDE = 220_000;
/** A flight that ends below the handoff line over Turkey would bounce straight into the terrain atlas. */
const LOWEST_OVER_ATLAS = ENTER_ATLAS_ALTITUDE + 60_000;

export function pickedSiteFromRow(catalogue: WorldCatalogue, row: number): PickedSite {
  const { core, index } = catalogue;
  return {
    id: core.id[row],
    name: core.name[row],
    lon: core.lon[row],
    lat: core.lat[row],
    siteType: index.siteTypes[core.type[row]] ?? "other",
    startYear: core.start[row],
    endYear: core.end[row],
    featured: core.featured[row] === 1,
    source: index.sources[core.source[row]]?.id ?? "",
  };
}

/** For a site outside the core file (a shared link to one): the detail record knows where it is, not its dates. */
export function pickedSiteFromDetail(id: string, detail: SiteDetail): PickedSite {
  const source = id.startsWith("osm-") ? "osm" : /^Q\d+$/.test(id) ? "wikidata" : "pleiades";
  return {
    id, name: detail.name, lon: detail.lon, lat: detail.lat, siteType: "other",
    startYear: null, endYear: null, featured: false, source,
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
