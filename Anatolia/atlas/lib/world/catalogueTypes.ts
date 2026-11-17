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
}

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

type OmittedWhenEmpty = "wikipedia" | "image" | "types" | "heritage";

/** A detail record as written to detail/<bucket>.json: null and empty fields are left out, and `ids` has no null entries. */
export type StoredSiteDetail = Omit<SiteDetail, OmittedWhenEmpty> & Partial<Pick<SiteDetail, OmittedWhenEmpty>>;

export function siteDetailFromStored(stored: StoredSiteDetail): SiteDetail {
  return { wikipedia: null, image: null, types: [], heritage: [], ...stored };
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
