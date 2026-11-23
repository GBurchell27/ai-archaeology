"use client";

import { useCallback, useMemo, useRef, useState, type RefObject } from "react";
import type { GlobeLook } from "@/lib/globe/ellipsoid";
import { GLOBE_PRESETS, type SettingsPresetId } from "@/lib/settings/settingsPresets";
import { useWorldCatalogue, type WorldCatalogue } from "@/lib/world/catalogueLoader";
import type { FeaturedSite, SiteColumns } from "@/lib/world/catalogueTypes";
import { randomAcceptedWonder, tourStops } from "@/lib/world/wonders";
import { NEWS_PINS_START_ON } from "@/lib/news/recentNews";
import type { YearSpan } from "@/lib/world/worldEras";
import { usePaleoLayer, type PaleoLayerViewModel } from "./paleo/usePaleoLayer";
import { useNewsPins, type NewsPin } from "./useNewsPins";
import { useSiteFilter, type SiteFilterViewModel } from "./useSiteFilter";
import { useSiteSelection, type SiteSelectionViewModel } from "./useSiteSelection";
import { useTheoryLens, type TheoryLensViewModel } from "./useTheoryLens";

/** "most-voted" and "account" are offered only when accounts are configured (docs/accounts.md). */
export type ExplorerPanel = "wonders" | "theories" | "settings" | "about" | "most-voted" | "account";

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
  /** The theory lens: the picked theory and the sites it is about. Off unless the Theories panel is open. */
  theoryLens: TheoryLensViewModel;
  panel: ExplorerPanel | null;
  showOsmMegaliths: boolean;
  /** Monument names and count badges on the globe. */
  showLabels: boolean;
  setShowLabels(show: boolean): void;
  /** Recent reports the catalogue holds, and the ones the filters leave visible as rings. */
  newsPins: readonly NewsPin[];
  newsRings: readonly NewsPin[];
  /** The rings. On at the start. The list in the legend stays either way. */
  showNewsPins: boolean;
  setShowNewsPins(show: boolean): void;
  /** The globe reports which regional cells it has on show, so the counts can include them. */
  setLoadedCells(cells: readonly SiteColumns[]): void;
  togglePanel(panel: ExplorerPanel): void;
  /** Opens the Theories panel on one theory, putting away a site card that covers it. */
  openTheory(theoryId: string): void;
  /** Escape: closes the site card if one is open, otherwise the open panel. Returns false when nothing was open. */
  closeTop(): boolean;
  setShowOsmMegaliths(show: boolean): void;
  /** The imagery the visitor picked, or null for the default with its fallback. */
  basemapId: string | null;
  /** The ice and sea level layer, which follows the timeline's years. */
  paleo: PaleoLayerViewModel;
  setBasemapId(basemapId: string): void;
  /** Sets the year range, the type filter and the megalith layer to a settings preset. */
  applyPreset(presetId: SettingsPresetId): void;
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
  initialTheoryId?: string;
  look: RefObject<GlobeLook | null>;
  onSelectSite?: (siteId: string | null) => void;
  onSelectTheory?: (theoryId: string | null) => void;
}): GlobeExplorerViewModel {
  const { catalogue, error: catalogueError } = useWorldCatalogue();
  const [loadedCells, setLoadedCells] = useState<readonly SiteColumns[]>([]);
  const filters = useSiteFilter(catalogue, loadedCells);
  const [showLabels, setShowLabels] = useState(true);
  const [showNewsPins, setShowNewsPins] = useState(NEWS_PINS_START_ON);
  const selection = useSiteSelection({
    catalogue, initialSiteId: options.initialSiteId, look: options.look, onSelectSite: options.onSelectSite,
  });
  const tour = useWonderTour(catalogue, selection.selected?.id ?? null, selection.visitById);
  const [panel, setPanel] = useState<ExplorerPanel | null>(options.initialTheoryId ? "theories" : null);
  const theoryLens = useTheoryLens({
    catalogue, shown: panel === "theories", initialTheoryId: options.initialTheoryId,
    look: options.look, flyToLook: selection.flyToLook, onSelectTheory: options.onSelectTheory,
  });
  const [showOsmMegaliths, setShowOsmMegaliths] = useState(false);
  const [basemapId, setBasemapId] = useState<string | null>(null);
  const paleoSpan = useMemo<YearSpan>(
    () => (filters.playYear === null ? filters.yearSpan : [filters.playYear, filters.playYear]),
    [filters.playYear, filters.yearSpan],
  );
  const paleo = usePaleoLayer(paleoSpan);
  // The filter's range is the revealed window, so a ring ahead of the playhead drops out and undated rings follow Include undated.
  const news = useNewsPins(catalogue, filters.filter);

  const { setYearSpan, setShowUndated, setFeaturedOnly, showOnlyTypes } = filters;
  const applyPreset = useCallback((presetId: SettingsPresetId) => {
    const preset = GLOBE_PRESETS[presetId];
    setYearSpan(preset.yearSpan);
    setShowUndated(preset.showUndated);
    setFeaturedOnly(preset.featuredOnly);
    showOnlyTypes(preset.onlyTypes);
    setShowOsmMegaliths(preset.osmMegaliths);
  }, [setYearSpan, setShowUndated, setFeaturedOnly, showOnlyTypes]);

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

  const { setTheoryId } = theoryLens;
  const openTheory = useCallback((theoryId: string) => {
    if (open.current.selected) select(null);
    setTheoryId(theoryId);
    setPanel("theories");
  }, [select, setTheoryId]);

  const { visitById } = selection;
  const visitRandomWonder = useCallback(() => {
    const wonder = randomAcceptedWonder(catalogue?.featured ?? [], open.current.selected?.id ?? null);
    if (wonder) visitById(wonder.id);
  }, [catalogue, visitById]);

  return useMemo(() => ({
    catalogue, catalogueError, filters, selection, tour, theoryLens, panel, showOsmMegaliths, showLabels, basemapId, paleo,
    newsPins: news.pins, newsRings: news.rings, showNewsPins,
    togglePanel, openTheory, closeTop, setShowOsmMegaliths, setShowLabels, setShowNewsPins, setLoadedCells, setBasemapId, applyPreset, visitRandomWonder,
  }), [
    catalogue, catalogueError, filters, selection, tour, theoryLens, panel, showOsmMegaliths, showLabels, basemapId, paleo,
    news.pins, news.rings, showNewsPins,
    togglePanel, openTheory, closeTop, applyPreset, visitRandomWonder,
  ]);
}
