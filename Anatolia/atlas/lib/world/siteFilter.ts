// Which catalogue rows the timeline and type filters let through.

import type { SiteColumns } from "./catalogueTypes";

export interface SiteFilter {
  /** Calendar years, negative BCE; null = all time. */
  range: [number, number] | null;
  showUndated: boolean;
  /** siteType names; null = all. */
  types: ReadonlySet<string> | null;
  featuredOnly: boolean;
  /**
   * Undated catalogue ids a running tour still draws. Other undated sites stay hidden.
   * Absent unless a tour is on.
   */
  keepUndatedIds?: ReadonlySet<string>;
}

export const ALL_SITES: SiteFilter = { range: null, showUndated: true, types: null, featuredOnly: false };

export function siteMatches(columns: SiteColumns, row: number, filter: SiteFilter, siteTypes: string[]): boolean {
  if (filter.featuredOnly && columns.featured[row] !== 1) return false;
  if (filter.types && !filter.types.has(siteTypes[columns.type[row]])) return false;
  if (!filter.range) return true;
  const start = columns.start[row];
  const end = columns.end[row];
  if (start === null && end === null) return filter.showUndated || filter.keepUndatedIds?.has(columns.id[row]) === true;
  // A site with one known bound is treated as a moment at that bound.
  return (start ?? end)! <= filter.range[1] && (end ?? start)! >= filter.range[0];
}

/** The same filter, plus the undated sites a running tour still draws. An empty list changes nothing. */
export function withTourUndated(filter: SiteFilter, siteIds: readonly string[]): SiteFilter {
  if (!siteIds.length) return filter;
  return { ...filter, keepUndatedIds: new Set(siteIds) };
}

/** One byte per row, 1 = shown. Rebuilt per filter change; the point geometry is not. */
export function siteVisibility(columns: SiteColumns, filter: SiteFilter, siteTypes: string[]): Uint8Array {
  const shown = new Uint8Array(columns.id.length);
  for (let row = 0; row < shown.length; row += 1) {
    shown[row] = siteMatches(columns, row, filter, siteTypes) ? 1 : 0;
  }
  return shown;
}
