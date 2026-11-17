// Instant name search over the world catalogue. Names are folded once, in slices, so typing only scans strings.

import { searchKey } from "@/lib/search";
import type { SiteColumns } from "./catalogueTypes";

export const SEARCH_RESULT_LIMIT = 8;
export const MIN_QUERY_LENGTH = 2;

export interface SiteSearchIndex {
  columns: Pick<SiteColumns, "name" | "importance" | "featured">;
  /** Diacritic-free lower-case names, one per row; only the first `foldedRows` are filled. */
  folded: string[];
  foldedRows: number;
}

export function emptySearchIndex(columns: SiteSearchIndex["columns"]): SiteSearchIndex {
  return { columns, folded: new Array<string>(columns.name.length), foldedRows: 0 };
}

/** Folds the next slice of names in place. Returns true once every row is folded. */
export function foldNextNames(index: SiteSearchIndex, sliceRows: number): boolean {
  const until = Math.min(index.columns.name.length, index.foldedRows + sliceRows);
  for (let row = index.foldedRows; row < until; row += 1) index.folded[row] = searchKey(index.columns.name[row]);
  index.foldedRows = until;
  return until === index.columns.name.length;
}

/** 0 = the name starts with the query, 1 = a later word does, 2 = it only appears inside a word, -1 = no match. */
function matchRank(folded: string, needle: string): number {
  const at = folded.indexOf(needle);
  if (at < 0) return -1;
  if (at === 0) return 0;
  return folded.includes(` ${needle}`) || folded.includes(`-${needle}`) ? 1 : 2;
}

/** Catalogue rows that match, best first: prefix before substring, then featured, then importance, then shorter names. */
export function searchSites(index: SiteSearchIndex, query: string, limit = SEARCH_RESULT_LIMIT): number[] {
  const needle = searchKey(query);
  if (needle.length < MIN_QUERY_LENGTH) return [];
  const { featured, importance } = index.columns;
  const hits: { row: number; rank: number }[] = [];
  for (let row = 0; row < index.foldedRows; row += 1) {
    const rank = matchRank(index.folded[row], needle);
    if (rank >= 0) hits.push({ row, rank });
  }
  hits.sort((a, b) => (
    a.rank - b.rank
    || featured[b.row] - featured[a.row]
    || importance[b.row] - importance[a.row]
    || index.folded[a.row].length - index.folded[b.row].length
    || a.row - b.row
  ));
  return hits.slice(0, limit).map((hit) => hit.row);
}
