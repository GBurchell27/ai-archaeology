import { useEffect, useRef } from "react";
import type { HistoryEntry } from "@/lib/globe/viewHistory";

/**
 * Writes the address. "replace" rewrites the entry the visitor is in, which is right for camera moves and selections;
 * "push" adds one entry, for a change of view, so Back returns to the view before.
 * The router's own state is carried over, so it still recognises the entry when Back lands on it.
 */
export function writeHistoryEntry(url: string, entry: HistoryEntry): void {
  if (entry === "push") window.history.pushState(window.history.state, "", url);
  else window.history.replaceState(window.history.state, "", url);
}

/** Calls `onTraverse` with the query of the entry that Back or Forward has just landed on. */
export function useHistoryTraversal(onTraverse: (search: string) => void): void {
  const latest = useRef(onTraverse);
  latest.current = onTraverse;
  useEffect(() => {
    const traverse = () => latest.current(window.location.search);
    window.addEventListener("popstate", traverse);
    return () => window.removeEventListener("popstate", traverse);
  }, []);
}
