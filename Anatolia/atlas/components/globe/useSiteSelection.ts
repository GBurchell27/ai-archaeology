"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { GlobeLook } from "@/lib/globe/ellipsoid";
import { loadSiteDetail, type WorldCatalogue } from "@/lib/world/catalogueLoader";
import { pickedSiteFromDetail, pickedSiteFromRow, rowOfSite, siteArrivalLook } from "@/lib/world/sitePick";
import type { GlobeFlyTo } from "./GlobeFlight";
import type { PickedSite } from "./GlobeSites";

export interface SiteSelectionViewModel {
  selected: PickedSite | null;
  flyTo: GlobeFlyTo | null;
  /** Opens the site card without moving the camera (a click on a point already in view). */
  select(site: PickedSite | null): void;
  /** Opens the site card and flies there. */
  visit(site: PickedSite): void;
  /** Opens a core-catalogue site by id; false when the id is not in the core file. */
  visitById(siteId: string): boolean;
  flyCloser(): void;
  flyToLook(look: GlobeLook): void;
}

/** Which site is open, the camera flights that go with it, and restoring a shared `?site=` link. */
export function useSiteSelection(options: {
  catalogue: WorldCatalogue | null;
  initialSiteId: string | undefined;
  look: RefObject<GlobeLook | null>;
  onSelectSite: ((siteId: string | null) => void) | undefined;
}): SiteSelectionViewModel {
  const { catalogue, initialSiteId, look, onSelectSite } = options;
  const [selected, setSelected] = useState<PickedSite | null>(null);
  const [flyTo, setFlyTo] = useState<GlobeFlyTo | null>(null);
  const flightToken = useRef(0);
  const restored = useRef(false);

  const flyToLook = useCallback((target: GlobeLook) => {
    flightToken.current += 1;
    setFlyTo({ ...target, token: flightToken.current });
  }, []);

  const select = useCallback((site: PickedSite | null) => {
    setSelected(site);
    onSelectSite?.(site?.id ?? null);
  }, [onSelectSite]);

  const flyToSite = useCallback((site: PickedSite, closer: boolean) => {
    flyToLook(siteArrivalLook(site, look.current?.altitude ?? Infinity, closer));
  }, [flyToLook, look]);

  const visit = useCallback((site: PickedSite) => {
    select(site);
    flyToSite(site, false);
  }, [flyToSite, select]);

  const visitById = useCallback((siteId: string) => {
    const row = catalogue ? rowOfSite(catalogue.core, siteId) : null;
    if (!catalogue || row === null) return false;
    visit(pickedSiteFromRow(catalogue, row));
    return true;
  }, [catalogue, visit]);

  const flyCloser = useCallback(() => {
    if (selected) flyToSite(selected, true);
  }, [flyToSite, selected]);

  useEffect(() => {
    if (!catalogue || !initialSiteId || restored.current) return;
    restored.current = true;
    if (visitById(initialSiteId)) return;
    // Not in the core file: an OSM megalith or a site from a regional cell. Its detail record still places it.
    void loadSiteDetail(initialSiteId).then((detail) => {
      if (detail) visit(pickedSiteFromDetail(initialSiteId, detail));
    });
  }, [catalogue, initialSiteId, visit, visitById]);

  return useMemo(
    () => ({ selected, flyTo, select, visit, visitById, flyCloser, flyToLook }),
    [selected, flyTo, select, visit, visitById, flyCloser, flyToLook],
  );
}
