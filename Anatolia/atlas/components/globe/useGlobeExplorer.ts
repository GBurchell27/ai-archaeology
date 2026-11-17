"use client";

import { useCallback, useMemo, useRef, useState, type RefObject } from "react";
import type { GlobeLook } from "@/lib/globe/ellipsoid";
import { useWorldCatalogue, type WorldCatalogue } from "@/lib/world/catalogueLoader";
import type { FeaturedSite } from "@/lib/world/catalogueTypes";
import { randomAcceptedWonder, tourStops } from "@/lib/world/wonders";
import { useSiteFilter, type SiteFilterViewModel } from "./useSiteFilter";
import { useSiteSelection, type SiteSelectionViewModel } from "./useSiteSelection";

export type ExplorerPanel = "wonders" | "layers" | "about";

export interface WonderTourViewModel {
  stops: FeaturedSite[];
  /** Index of the stop on show, or null when no tour is running. */
  at: number | null;
  start(): void;
  step(delta: 1 | -1): void;
  end(): void;
}

export interface GlobeExplorerViewModel {
  catalogue: WorldCatalogue | null;
  catalogueError: string | null;
  filters: SiteFilterViewModel;
  selection: SiteSelectionViewModel;
  tour: WonderTourViewModel;
  panel: ExplorerPanel | null;
  showOsmMegaliths: boolean;
  togglePanel(panel: ExplorerPanel): void;
  /** Escape: closes the site card if one is open, otherwise the open panel. Returns false when nothing was open. */
  closeTop(): boolean;
  setShowOsmMegaliths(show: boolean): void;
  visitRandomWonder(): void;
}

/** The tour is over as soon as the open site is no longer its current stop: a pick, a search, or closing the card ends it. */
function useWonderTour(
  catalogue: WorldCatalogue | null,
  selectedId: string | null,
  visitById: (siteId: string) => boolean,
): WonderTourViewModel {
  const [index, setIndex] = useState<number | null>(null);
  const stops = useMemo(() => tourStops(catalogue?.featured ?? []), [catalogue]);
  const at = index !== null && stops[index]?.id === selectedId ? index : null;
  const show = useCallback((next: number) => {
    const stop = stops[next];
    if (!stop) return;
    setIndex(next);
    visitById(stop.id);
  }, [stops, visitById]);
  const start = useCallback(() => show(0), [show]);
  const step = useCallback((delta: 1 | -1) => show((at ?? 0) + delta), [at, show]);
  const end = useCallback(() => setIndex(null), []);
  return useMemo(() => ({ stops, at, start, step, end }), [stops, at, start, step, end]);
}

/**
 * The globe explorer's view model. `look` is a ref on purpose: the camera reports ~8 times a second
 * and nothing in the chrome should re-render for it.
 */
export function useGlobeExplorer(options: {
  initialSiteId?: string;
  look: RefObject<GlobeLook | null>;
  onSelectSite?: (siteId: string | null) => void;
}): GlobeExplorerViewModel {
  const { catalogue, error: catalogueError } = useWorldCatalogue();
  const filters = useSiteFilter(catalogue);
  const selection = useSiteSelection({
    catalogue, initialSiteId: options.initialSiteId, look: options.look, onSelectSite: options.onSelectSite,
  });
  const tour = useWonderTour(catalogue, selection.selected?.id ?? null, selection.visitById);
  const [panel, setPanel] = useState<ExplorerPanel | null>(null);
  const [showOsmMegaliths, setShowOsmMegaliths] = useState(false);

  const open = useRef({ selected: selection.selected, panel });
  open.current = { selected: selection.selected, panel };
  const { select } = selection;
  const closeTop = useCallback(() => {
    if (open.current.selected) {
      select(null);
      return true;
    }
    if (!open.current.panel) return false;
    setPanel(null);
    return true;
  }, [select]);

  const togglePanel = useCallback((next: ExplorerPanel) => {
    // A site card sits on top of the panel column: asking for a panel puts the card away first.
    const cardWasOpen = open.current.selected !== null;
    if (cardWasOpen) select(null);
    setPanel((current) => (current === next && !cardWasOpen ? null : next));
  }, [select]);

  const { visitById } = selection;
  const visitRandomWonder = useCallback(() => {
    const wonder = randomAcceptedWonder(catalogue?.featured ?? [], open.current.selected?.id ?? null);
    if (wonder) visitById(wonder.id);
  }, [catalogue, visitById]);

  return useMemo(() => ({
    catalogue, catalogueError, filters, selection, tour, panel, showOsmMegaliths,
    togglePanel, closeTop, setShowOsmMegaliths, visitRandomWonder,
  }), [
    catalogue, catalogueError, filters, selection, tour, panel, showOsmMegaliths,
    togglePanel, closeTop, visitRandomWonder,
  ]);
}
