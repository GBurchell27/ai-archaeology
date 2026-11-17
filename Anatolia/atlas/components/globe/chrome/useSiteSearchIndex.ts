"use client";

import { useEffect, useState } from "react";
import type { SiteColumns } from "@/lib/world/catalogueTypes";
import { emptySearchIndex, foldNextNames, type SiteSearchIndex } from "@/lib/world/siteSearch";

const FIRST_SLICE_DELAY_MS = 250;
const SLICE_ROWS = 20_000;

/**
 * Folds the catalogue names for search after the first paint, a slice per task, so ~150k names never block a frame.
 * `foldedRows` in the returned object grows until the whole catalogue is searchable.
 */
export function useSiteSearchIndex(columns: SiteColumns | null): { index: SiteSearchIndex | null; foldedRows: number } {
  const [state, setState] = useState<{ index: SiteSearchIndex | null; foldedRows: number }>({ index: null, foldedRows: 0 });
  useEffect(() => {
    if (!columns) return;
    const index = emptySearchIndex(columns);
    let timer = window.setTimeout(function foldSlice() {
      const done = foldNextNames(index, SLICE_ROWS);
      setState({ index, foldedRows: index.foldedRows });
      if (!done) timer = window.setTimeout(foldSlice, 0);
    }, FIRST_SLICE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [columns]);
  return state;
}
