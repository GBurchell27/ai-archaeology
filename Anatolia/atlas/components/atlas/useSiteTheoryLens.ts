"use client";

import { useCallback, useMemo, useState } from "react";
import { findTheory } from "@/lib/theories/theoryRegistry";

const NO_SITES: readonly string[] = [];

export interface SiteTheoryLens {
  /** The theory open in the selected site's panel, or null. */
  theoryId: string | null;
  /** Every site id that theory lists: the map rings the curated sites among them. */
  siteIds: readonly string[];
  /** Opens a theory in the panel; asking for the open one closes it. */
  toggleTheory(theoryId: string): void;
}

/**
 * The theory picked in the site panel of the Anatolia map. It belongs to the selected site: closing the panel
 * or selecting another place turns the lens off, so no ring is left on the map without its card.
 */
export function useSiteTheoryLens(selectedId: string | null): SiteTheoryLens {
  const [picked, setPicked] = useState<{ siteId: string; theoryId: string } | null>(null);
  const theoryId = picked && picked.siteId === selectedId ? picked.theoryId : null;
  const siteIds = useMemo(() => findTheory(theoryId ?? undefined)?.siteIds ?? NO_SITES, [theoryId]);
  const toggleTheory = useCallback((next: string) => {
    if (selectedId === null) return;
    setPicked((current) => (current?.siteId === selectedId && current.theoryId === next ? null : { siteId: selectedId, theoryId: next }));
  }, [selectedId]);
  return useMemo(() => ({ theoryId, siteIds, toggleTheory }), [theoryId, siteIds, toggleTheory]);
}
