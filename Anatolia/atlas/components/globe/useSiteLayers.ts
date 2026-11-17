"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GlobeLook } from "@/lib/globe/ellipsoid";
import { buildSiteBlock, buildSiteBlockInSlices, type SiteBlock, type SiteLayer } from "@/lib/globe/siteBlock";
import { fetchWorldFile, type WorldCatalogue } from "@/lib/world/catalogueLoader";
import type { SiteColumns, WorldIndex } from "@/lib/world/catalogueTypes";
import { SiteCellCache, cellKeysInView } from "@/lib/world/cellLoader";
import { siteVisibility, type SiteFilter } from "@/lib/world/siteFilter";
import { OSM_MEGALITH_STYLE } from "@/lib/world/siteTypeStyle";

const blocks = new WeakMap<SiteColumns, SiteBlock>();

function blockFor(key: string, columns: SiteColumns, siteTypes: string[], fixedColor?: string): SiteBlock {
  let block = blocks.get(columns);
  if (!block) {
    block = buildSiteBlock(key, columns, siteTypes, fixedColor);
    blocks.set(columns, block);
  }
  return block;
}

/** The detail cells for the current view: fetched as the camera comes down, dropped from the draw list when out of view. */
function useSiteCells(index: WorldIndex, look: GlobeLook | null): { key: string; columns: SiteColumns }[] {
  const cache = useMemo(() => new SiteCellCache((key) => fetchWorldFile<SiteColumns>(`cells/${key}.json`)), []);
  const [, announceArrival] = useState(0);
  // Asking twice is harmless (the cache de-duplicates), so this is safe to do while rendering.
  const ready = look ? cache.request(cellKeysInView(look, index.cells), () => announceArrival((count) => count + 1)) : [];
  const signature = ready.map((cell) => cell.key).join(" ");
  // The look changes eight times a second; the cell list only when a cell enters, leaves or arrives.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => ready, [signature]);
}

const building = new WeakSet<SiteColumns>();

function untilIdle(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(() => resolve(), { timeout: 250 });
    else window.setTimeout(resolve, 0);
  });
}

/** Draw blocks for the arrived cells, built in idle time; a cell joins the globe once its block is whole. */
function useCellBlocks(cells: { key: string; columns: SiteColumns }[], siteTypes: string[]): SiteBlock[] {
  const [, announceBuilt] = useState(0);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  useEffect(() => {
    for (const cell of cells) {
      if (blocks.has(cell.columns) || building.has(cell.columns)) continue;
      building.add(cell.columns);
      void buildSiteBlockInSlices(`cell-${cell.key}`, cell.columns, siteTypes, untilIdle).then((block) => {
        blocks.set(cell.columns, block);
        building.delete(cell.columns);
        if (mounted.current) announceBuilt((count) => count + 1);
      });
    }
  }, [cells, siteTypes]);
  const built = cells.flatMap((cell) => blocks.get(cell.columns) ?? []);
  const signature = built.map((block) => block.key).join(" ");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => built, [signature]);
}

/** The separate OpenStreetMap megalith block, fetched the first time the layer is switched on. */
function useOsmMegaliths(index: WorldIndex, enabled: boolean): SiteColumns | null {
  const [columns, setColumns] = useState<SiteColumns | null>(null);
  const file = index.osmMegaliths?.file;
  useEffect(() => {
    if (!enabled || !file || columns) return;
    let live = true;
    fetchWorldFile<SiteColumns>(file).then(
      (fetched) => { if (live && fetched) setColumns(fetched); },
      () => undefined, // the layer stays empty; toggling it again retries
    );
    return () => { live = false; };
  }, [enabled, file, columns]);
  return enabled ? columns : null;
}

/** Every block of sites on the globe right now, each with the rows the filter lets through. Core is always first. */
export function useSiteLayers(
  catalogue: WorldCatalogue,
  filter: SiteFilter,
  look: GlobeLook | null,
  showOsmMegaliths: boolean,
): SiteLayer[] {
  const { index, core } = catalogue;
  const cells = useCellBlocks(useSiteCells(index, look), index.siteTypes);
  const osm = useOsmMegaliths(index, showOsmMegaliths);
  return useMemo(() => {
    const drawn = [
      blockFor("core", core, index.siteTypes),
      ...cells,
      ...(osm ? [blockFor("osm-megaliths", osm, index.siteTypes, OSM_MEGALITH_STYLE.color)] : []),
    ];
    return drawn.map((block) => ({ block, shown: siteVisibility(block.columns, filter, index.siteTypes) }));
  }, [index, core, cells, osm, filter]);
}
