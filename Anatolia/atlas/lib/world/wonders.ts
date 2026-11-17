// The curated "wonders" tier: grouping, filtering, the guided tour, and the lucky dip.

import { searchKey } from "@/lib/search";
import type { FeaturedSite } from "./catalogueTypes";
import { WORLD_ERAS, eraOfYear } from "./worldEras";

export type WonderGrouping = "era" | "country";

export interface WonderGroup {
  title: string;
  sites: FeaturedSite[];
}

/** Hand-ordered: the earliest monumental building first, then outward in time and space. */
export const TOUR_SITE_IDS: readonly string[] = [
  "Q214944", // Göbekli Tepe
  "Q5996986", // Karahan Tepe
  "Q2402267", // Jericho
  "Q192522", // Çatalhöyük
  "Q1535226", // Nabta Playa
  "Q833850", // Carnac stones
  "Q216862", // Ġgantija
  "Q339503", // Newgrange
  "Q39671", // Stonehenge
  "Q12508", // Giza pyramid complex
  "Q219279", // Caral
  "Q5725", // Mohenjo-daro
];

export const WONDER_STATUS: Record<FeaturedSite["status"], { badge: string; note: string } | null> = {
  accepted: null,
  contested: {
    badge: "Contested",
    note: "Specialists disagree about the age or the human origin of this place.",
  },
  "natural-or-pseudo": {
    badge: "Natural or pseudo-archaeology",
    note: "Mainstream research reads this as a natural formation or an unsupported claim. It is listed so the claim can be weighed against the evidence.",
  },
};

export function categoryTitle(category: string): string {
  const words = category.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function tourStops(featured: FeaturedSite[]): FeaturedSite[] {
  const byId = new Map(featured.map((site) => [site.id, site]));
  return TOUR_SITE_IDS.flatMap((id) => byId.get(id) ?? []);
}

/** A random accepted wonder, never the one already open. */
export function randomAcceptedWonder(featured: FeaturedSite[], exceptId: string | null, random = Math.random): FeaturedSite | null {
  const pool = featured.filter((site) => site.status === "accepted" && site.id !== exceptId);
  return pool.length ? pool[Math.floor(random() * pool.length)] : null;
}

function matchesQuery(site: FeaturedSite, needle: string): boolean {
  return [site.name, site.country, site.period, site.category].some((field) => searchKey(field).includes(needle));
}

function groupTitle(site: FeaturedSite, grouping: WonderGrouping): string {
  if (grouping === "country") return site.country || "Unplaced";
  return site.startYear === null ? "Undated" : eraOfYear(site.startYear).label;
}

/** Era groups run oldest first; country groups run A to Z. Empty groups are left out. */
export function groupWonders(featured: FeaturedSite[], grouping: WonderGrouping, query: string): WonderGroup[] {
  const needle = searchKey(query);
  const groups = new Map<string, FeaturedSite[]>();
  for (const site of featured) {
    if (needle && !matchesQuery(site, needle)) continue;
    const title = groupTitle(site, grouping);
    groups.set(title, [...(groups.get(title) ?? []), site]);
  }
  const eraOrder = [...WORLD_ERAS.map((era) => era.label), "Undated"];
  const titles = [...groups.keys()].sort((a, b) => (
    grouping === "era" ? eraOrder.indexOf(a) - eraOrder.indexOf(b) : a.localeCompare(b)
  ));
  return titles.map((title) => ({
    title,
    sites: groups.get(title)!.sort((a, b) => (
      grouping === "era" ? (a.startYear ?? 0) - (b.startYear ?? 0) : a.name.localeCompare(b.name)
    )),
  }));
}
