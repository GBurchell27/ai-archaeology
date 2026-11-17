// Live numbers for the globe chrome: how many catalogue rows the current filter shows.

import type { SiteColumns } from "./catalogueTypes";
import { siteMatches, type SiteFilter } from "./siteFilter";

export interface SiteCounts {
  /** Rows in the blocks counted: core plus whichever regional cells are loaded. */
  loaded: number;
  /** Rows the whole filter lets through. */
  shown: number;
  /** Rows with no dates at all that pass the type and featured filters, whether or not undated sites are on. */
  undated: number;
  /** Per site type index: rows that pass the time and featured filters, ignoring the type filter. */
  byType: number[];
}

/** Counts over every block given: the core file and the regional cells on the globe right now. */
export function countSites(blocks: readonly SiteColumns[], filter: SiteFilter, siteTypes: string[]): SiteCounts {
  const counts: SiteCounts = { loaded: 0, shown: 0, undated: 0, byType: siteTypes.map(() => 0) };
  for (const columns of blocks) countBlock(counts, columns, filter, siteTypes);
  return counts;
}

function countBlock(counts: SiteCounts, columns: SiteColumns, filter: SiteFilter, siteTypes: string[]): void {
  const anyType: SiteFilter = { ...filter, types: null };
  const anyTime: SiteFilter = { ...filter, range: null };
  counts.loaded += columns.id.length;
  for (let row = 0; row < columns.id.length; row += 1) {
    const typeAllowed = !filter.types || filter.types.has(siteTypes[columns.type[row]]);
    if (siteMatches(columns, row, anyType, siteTypes)) {
      counts.byType[columns.type[row]] += 1;
      if (typeAllowed) counts.shown += 1;
    }
    const isUndated = columns.start[row] === null && columns.end[row] === null;
    if (isUndated && siteMatches(columns, row, anyTime, siteTypes)) counts.undated += 1;
  }
}
