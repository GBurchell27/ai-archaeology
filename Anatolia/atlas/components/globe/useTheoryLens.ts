"use client";

import { useCallback, useEffect, useMemo, useState, type RefObject } from "react";
import type { GlobeLook, LonLat } from "@/lib/globe/ellipsoid";
import { altitudeToSee, spanOfSites } from "@/lib/globe/siteSpan";
import { MAX_GLOBE_ALTITUDE } from "@/lib/globe/viewUrl";
import { findTheory } from "@/lib/theories/theoryRegistry";
import { loadSiteDetail, type WorldCatalogue } from "@/lib/world/catalogueLoader";
import { rowOfSite, siteArrivalLook } from "@/lib/world/sitePick";

/** A site a theory is about, as the world catalogue places it. */
interface TouchedSite extends LonLat {
  id: string;
}

export interface TheoryLensViewModel {
  /** The theory the lens is on, or null when it is off. */
  theoryId: string | null;
  /** The catalogue ids of the sites that theory is about: the globe rings these. Stable until the theory changes. */
  siteIds: readonly string[];
  setTheoryId(theoryId: string | null): void;
  /** Flies to where every ringed site is in view. */
  showOnGlobe(): void;
}

const NO_SITES: readonly TouchedSite[] = [];
/** Wikidata, Pleiades and OpenStreetMap ids, as the world catalogue writes them. */
const CATALOGUE_ID = /^(?:Q\d+|\d+|osm-[a-z0-9-]+)$/;

/** The theory's site ids split into the sites core.json holds and the ids it does not. */
function sitesInCore(catalogue: WorldCatalogue | null, theoryId: string | null): { held: readonly TouchedSite[]; otherIds: readonly string[] } {
  const theory = findTheory(theoryId ?? undefined);
  if (!catalogue || !theory) return { held: NO_SITES, otherIds: [] };
  const rows = theory.siteIds.map((id) => ({ id, row: rowOfSite(catalogue.core, id) }));
  return {
    held: rows.flatMap(({ id, row }) => (row === null ? [] : { id, longitude: catalogue.core.lon[row], latitude: catalogue.core.lat[row] })),
    // Only ids shaped like a catalogue id are worth a detail lookup; a curated slug would only fetch a file that is not there.
    otherIds: rows.filter(({ id, row }) => row === null && CATALOGUE_ID.test(id)).map(({ id }) => id),
  };
}

async function siteFromDetail(id: string): Promise<TouchedSite | null> {
  const detail = await loadSiteDetail(id);
  return detail ? { id, longitude: detail.lon, latitude: detail.lat } : null;
}

/**
 * The theory's sites that the world catalogue holds: those of core.json at once, the rest when their detail
 * record arrives. A theory also lists the ids other views use (the walk's, the Anatolia map's), which the
 * catalogue does not hold and which are left out. It reads the catalogue and changes nothing in it.
 */
function useTouchedSites(catalogue: WorldCatalogue | null, theoryId: string | null): readonly TouchedSite[] {
  const { held, otherIds } = useMemo(() => sitesInCore(catalogue, theoryId), [catalogue, theoryId]);
  const [late, setLate] = useState<{ theoryId: string | null; sites: readonly TouchedSite[] } | null>(null);
  useEffect(() => {
    if (!otherIds.length) return;
    let live = true;
    void Promise.all(otherIds.map(siteFromDetail)).then((sites) => {
      const found = sites.flatMap((site) => site ?? []);
      if (live && found.length) setLate({ theoryId, sites: found });
    });
    return () => { live = false; };
  }, [otherIds, theoryId]);
  return useMemo(() => (late && late.theoryId === theoryId ? [...held, ...late.sites] : held), [held, late, theoryId]);
}

/**
 * The theory lens of the globe: which theory is picked and which sites it is about. The lens is on only while
 * `shown` (the Theories panel is the open panel), so leaving the panel takes the rings off the globe.
 */
export function useTheoryLens(options: {
  catalogue: WorldCatalogue | null;
  shown: boolean;
  initialTheoryId: string | undefined;
  look: RefObject<GlobeLook | null>;
  flyToLook(look: GlobeLook): void;
  onSelectTheory: ((theoryId: string | null) => void) | undefined;
}): TheoryLensViewModel {
  const { catalogue, shown, look, flyToLook, onSelectTheory } = options;
  const [pickedId, setTheoryId] = useState<string | null>(options.initialTheoryId ?? null);
  const theoryId = shown ? pickedId : null;
  const sites = useTouchedSites(catalogue, theoryId);
  const siteIds = useMemo(() => sites.map((site) => site.id), [sites]);

  useEffect(() => { onSelectTheory?.(theoryId); }, [onSelectTheory, theoryId]);

  const showOnGlobe = useCallback(() => {
    const span = spanOfSites(sites);
    if (!span) return;
    const arrival = siteArrivalLook({ lon: span.longitude, lat: span.latitude }, look.current?.altitude ?? Infinity);
    flyToLook({ ...arrival, altitude: Math.min(MAX_GLOBE_ALTITUDE, Math.max(arrival.altitude, altitudeToSee(span))) });
  }, [sites, look, flyToLook]);

  return useMemo(() => ({ theoryId, siteIds, setTheoryId, showOnGlobe }), [theoryId, siteIds, showOnGlobe]);
}
