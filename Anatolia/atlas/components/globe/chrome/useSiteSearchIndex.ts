"use client";

import { useEffect, useState } from "react";
import { fetchWorldFile } from "@/lib/world/catalogueLoader";
import type { NameColumns } from "@/lib/world/catalogueTypes";
import { emptySearchIndex, foldNextNames, type SiteSearchIndex } from "@/lib/world/siteSearch";

const FIRST_SLICE_DELAY_MS = 250;
const SLICE_ROWS = 6000;

/** Runs `task` when the browser has nothing better to do; returns a way to call it off. */
function whenIdle(task: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(task, { timeout: 300 });
    return () => window.cancelIdleCallback(handle);
  }
  const timer = window.setTimeout(task, 0);
  return () => window.clearTimeout(timer);
}

export interface GrowingSearchIndex {
  index: SiteSearchIndex | null;
  /** Grows until every name is searchable. */
  foldedRows: number;
}

/** Folds names for search after the first paint, a slice per idle period, so 117k names never block a frame. */
export function useSiteSearchIndex(columns: SiteSearchIndex["columns"] | null): GrowingSearchIndex {
  const [state, setState] = useState<GrowingSearchIndex>({ index: null, foldedRows: 0 });
  useEffect(() => {
    if (!columns) return;
    const index = emptySearchIndex(columns);
    let cancel = () => window.clearTimeout(timer);
    function foldSlice() {
      const done = foldNextNames(index, SLICE_ROWS);
      setState({ index, foldedRows: index.foldedRows });
      if (!done) cancel = whenIdle(foldSlice);
    }
    const timer = window.setTimeout(foldSlice, FIRST_SLICE_DELAY_MS);
    return () => cancel();
  }, [columns]);
  return state;
}

/**
 * The names of every site outside the core file, fetched once `wanted` turns true (the search box
 * was focused). `settled` is true once the file has arrived or is known to be missing; without it
 * search simply stays core-only.
 */
export function useSiteNames(file: string | undefined, wanted: boolean): { names: NameColumns | null; settled: boolean } {
  const [state, setState] = useState<{ names: NameColumns | null; settled: boolean }>({ names: null, settled: false });
  useEffect(() => {
    if (!wanted) return;
    if (!file) {
      setState({ names: null, settled: true });
      return;
    }
    let live = true;
    fetchWorldFile<NameColumns>(file).then(
      (names) => { if (live) setState({ names, settled: true }); },
      () => { if (live) setState({ names: null, settled: true }); },
    );
    return () => { live = false; };
  }, [file, wanted]);
  return state;
}
