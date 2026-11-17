// Shapes of the static world catalogue under public/world/. Built by src/ai_archaeology/world.

export interface SiteColumns {
  id: string[];
  name: string[];
  lon: number[];
  lat: number[];
  type: number[]; // index into WorldIndex.siteTypes
  start: (number | null)[];
  end: (number | null)[];
  importance: number[];
  source: number[]; // index into WorldIndex.sources
  featured: number[]; // 1 or 0
}

export interface WorldSource {
  id: string;
  name: string;
  licence: string;
  attribution: string;
  url: string;
  count: number;
}

export interface WorldIndex {
  generated: string;
  count: number;
  coreCount: number;
  siteTypes: string[];
  sources: WorldSource[];
  cellDegrees: number;
  cells: Record<string, number>;
  osmMegaliths?: { count: number; file: string };
  namesFile?: string; // NameColumns for every site outside core.json
}

/** The search index: one row per site that is not in core.json, best known first. */
export type NameColumns = Pick<SiteColumns, "id" | "name" | "lon" | "lat" | "type" | "start" | "end">;

export interface FeaturedSite {
  id: string;
  name: string;
  lon: number;
  lat: number;
  country: string;
  category: string;
  period: string;
  startYear: number | null;
  endYear: number | null;
  datingConfidence: "high" | "medium" | "low";
  status: "accepted" | "contested" | "natural-or-pseudo";
  why: string;
  source: string;
}

export interface SiteDetail {
  lon: number;
  lat: number;
  name: string;
  sourceUrl: string;
  wikipedia: string | null;
  image: string | null;
  types: string[];
  heritage: string[];
  licence: string;
  attribution: string;
  datingSource: string;
  ids: Record<string, string | null>;
}

type OmittedWhenDefault = "wikipedia" | "image" | "types" | "heritage" | "sourceUrl";

/**
 * A detail record as written to detail/<bucket>.json. Null and empty fields are left out, `ids` has
 * no null entries and no copy of the record's own id, and `sourceUrl` is stored only when it is not
 * the one sourceUrlFor() gives.
 */
export type StoredSiteDetail = Omit<SiteDetail, OmittedWhenDefault> & Partial<Pick<SiteDetail, OmittedWhenDefault>>;

/** The source record of a site id: Wikidata item, OpenStreetMap node or way, else Pleiades place. */
export function sourceUrlFor(id: string): string {
  if (/^Q\d+$/.test(id)) return `https://www.wikidata.org/wiki/${id}`;
  const osm = /^osm-([nw])(\d+)$/.exec(id);
  if (osm) return `https://www.openstreetmap.org/${osm[1] === "n" ? "node" : "way"}/${osm[2]}`;
  return `https://pleiades.stoa.org/places/${id}`;
}

export function siteDetailFromStored(id: string, stored: StoredSiteDetail): SiteDetail {
  return { wikipedia: null, image: null, types: [], heritage: [], sourceUrl: sourceUrlFor(id), ...stored };
}

export const WORLD_CELL_DEGREES = 10;

export function cellKeyFor(lon: number, lat: number): string {
  const lonIndex = Math.min(35, Math.floor((lon + 180) / WORLD_CELL_DEGREES));
  const latIndex = Math.min(17, Math.floor((lat + 90) / WORLD_CELL_DEGREES));
  return `${lonIndex}_${latIndex}`;
}

export function detailBucket(id: string): string {
  return id.slice(-2).toLowerCase();
}
