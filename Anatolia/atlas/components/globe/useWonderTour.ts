"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  findGuidedTour, stopIndex, tourStopIsShowing, WONDERS_TOUR,
  type GuidedTourStop,
} from "@/lib/world/guidedTours";
import { loadSiteOutsideCore, type WorldCatalogue } from "@/lib/world/catalogueLoader";
import type { PickedSite } from "./GlobeSites";

export interface WonderTourViewModel {
  id: string | null;
  title: string;
  stops: readonly GuidedTourStop[];
  /** Index of the stop on show, or null when no tour is running. */
  at: number | null;
  caption: string;
  source: string;
  start(tourId?: string): void;
  step(delta: 1 | -1): void;
  end(): void;
}

const NO_STOPS: readonly GuidedTourStop[] = [];

interface TourFlight {
  catalogue: WorldCatalogue;
  siteId: string;
  token: number;
  flight: { current: number };
  visit(site: PickedSite): void;
  onMiss(): void;
}

/** A stop that is not in the core file: the cell or the detail record, ignored if a later step won. */
function flyToStopOutsideCore(flight: TourFlight): void {
  void loadSiteOutsideCore(flight.catalogue, flight.siteId).then((site) => {
    if (flight.flight.current !== flight.token) return;
    if (site) flight.visit(site);
    else flight.onMiss();
  });
}

interface OpenStop {
  id: string;
  atStop: string | undefined;
  catalogue: WorldCatalogue;
  selectedId: string | null;
  flight: { current: number };
  baseline: { current: string | null };
  visit(site: PickedSite): void;
  visitById(siteId: string): boolean;
  setTourId(id: string): void;
  setIndex(index: number): void;
  setPendingId(id: string | null): void;
  onMiss(): void;
}

function openStop(open: OpenStop): void {
  const chosen = findGuidedTour(open.id);
  const next = chosen ? stopIndex(chosen, open.atStop) : -1;
  const stop = next >= 0 ? chosen?.stops[next] : undefined;
  if (!chosen || !stop) return;
  open.baseline.current = open.selectedId;
  const token = ++open.flight.current;
  open.setTourId(chosen.id);
  open.setIndex(next);
  open.setPendingId(stop.siteId);
  if (open.visitById(stop.siteId)) {
    open.setPendingId(null);
    return;
  }
  flyToStopOutsideCore({
    catalogue: open.catalogue, siteId: stop.siteId, token, flight: open.flight, visit: open.visit, onMiss: open.onMiss,
  });
}

function useReportTour(
  ready: boolean,
  at: number | null,
  tourId: string | null,
  stopId: string | null,
  initialTourId: string | undefined,
  onChange: ((tourId: string | null, stopId: string | null) => void) | undefined,
): void {
  const reported = useRef(false);
  useEffect(() => {
    if (!ready) return;
    if (at === null || !tourId || !stopId) {
      // The catalogue has not started an address's tour yet. Reporting now would wipe the link.
      if (!reported.current && initialTourId) return;
      reported.current = true;
      onChange?.(null, null);
      return;
    }
    reported.current = true;
    onChange?.(tourId, stopId);
  }, [ready, at, tourId, stopId, initialTourId, onChange]);
}

function wondersStopsInCatalogue(catalogue: WorldCatalogue | null): readonly GuidedTourStop[] {
  const present = new Set((catalogue?.featured ?? []).map((site) => site.id));
  return WONDERS_TOUR.stops.filter((stop) => present.has(stop.siteId));
}

interface Playback {
  tourId: string | null;
  stops: readonly GuidedTourStop[];
  at: number | null;
  stopId: string | null;
  begin(id: string, atStop?: string): void;
  end(): void;
}

/** Which stop is on show, and the flights between them. A selection that is not the stop ends the tour. */
function useTourPlayback(options: {
  catalogue: WorldCatalogue | null;
  selectedId: string | null;
  visit(site: PickedSite): void;
  visitById(siteId: string): boolean;
  initialTourId?: string;
  initialStopId?: string;
}): Playback {
  const { catalogue, selectedId, visit, visitById, initialTourId, initialStopId } = options;
  const [tourId, setTourId] = useState<string | null>(null);
  const [index, setIndex] = useState<number | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const flight = useRef(0);
  const baseline = useRef<string | null>(null);
  const idleStops = useMemo(() => wondersStopsInCatalogue(catalogue), [catalogue]);
  const tour = tourId ? findGuidedTour(tourId) : undefined;
  const stops = tour?.stops ?? (catalogue ? idleStops : NO_STOPS);
  const stopId = index !== null ? stops[index]?.siteId ?? null : null;
  const showing = stopId !== null && tourStopIsShowing(stopId, selectedId, pendingId, baseline.current);
  const at = showing ? index : null;
  const end = useCallback(() => {
    flight.current += 1;
    setPendingId(null);
    setIndex(null);
    setTourId(null);
  }, []);
  const begin = useCallback((id: string, atStop?: string) => {
    if (!catalogue) return;
    openStop({
      id, atStop, catalogue, selectedId, flight, baseline, visit, visitById, onMiss: end,
      setTourId, setIndex, setPendingId,
    });
  }, [catalogue, end, selectedId, visit, visitById]);
  useTourLifetime(catalogue, index, stopId, showing, end, begin, initialTourId, initialStopId);
  return { tourId, stops, at, stopId, begin, end };
}

/** Ends the tour when the open site is no longer its stop, and starts the tour an address asked for. */
function useTourLifetime(
  catalogue: WorldCatalogue | null,
  index: number | null,
  stopId: string | null,
  showing: boolean,
  end: () => void,
  begin: (id: string, atStop?: string) => void,
  initialTourId: string | undefined,
  initialStopId: string | undefined,
): void {
  const booted = useRef(false);
  useEffect(() => {
    if (index !== null && stopId && !showing) end();
  }, [end, index, showing, stopId]);
  useEffect(() => {
    if (!catalogue || booted.current) return;
    booted.current = true;
    if (initialTourId) begin(initialTourId, initialStopId);
  }, [begin, catalogue, initialStopId, initialTourId]);
}

/**
 * The guided tour. Nothing advances on its own. Leaving the current stop — a pick, a search,
 * or closing the card — ends it. The wonders route is the one `start()` runs when no id is given.
 */
export function useWonderTour(options: {
  catalogue: WorldCatalogue | null;
  selectedId: string | null;
  visit(site: PickedSite): void;
  visitById(siteId: string): boolean;
  initialTourId?: string;
  initialStopId?: string;
  onChange?(tourId: string | null, stopId: string | null): void;
}): WonderTourViewModel {
  const { tourId, stops, at, stopId, begin, end } = useTourPlayback(options);
  useReportTour(options.catalogue !== null, at, tourId, stopId, options.initialTourId, options.onChange);
  const start = useCallback((id?: string) => begin(id ?? WONDERS_TOUR.id), [begin]);
  const step = useCallback((delta: 1 | -1) => {
    if (at === null || !tourId) return;
    const next = stops[at + delta];
    if (next) begin(tourId, next.siteId);
  }, [at, begin, stops, tourId]);
  const caption = at !== null ? stops[at]?.caption ?? "" : "";
  const source = at !== null ? stops[at]?.source ?? "" : "";
  const title = at !== null ? findGuidedTour(tourId ?? "")?.title ?? "Tour" : "";
  return useMemo(() => ({
    id: at !== null ? tourId : null, title, stops, at, caption, source, start, step, end,
  }), [at, caption, end, source, start, step, stops, title, tourId]);
}
