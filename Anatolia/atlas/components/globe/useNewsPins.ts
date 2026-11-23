"use client";

// Recent reports resolved to catalogue sites the globe can fly to.
// The core file is indexed once; a frame never walks it. A site outside that file
// is asked for by its own detail record, and only when a recent report names it.

import { useEffect, useMemo, useState } from "react";
import {
  NEWS_RECENCY_DAYS, isCatalogueSiteId, isWithinLastDays, localIsoDay, recentNewsSites, type RecentNewsSite,
} from "@/lib/news/recentNews";
import { NEWS_ITEMS, type NewsItem } from "@/lib/news/siteNews";
import type { PickedSite } from "@/lib/globe/siteBlock";
import { loadSiteDetail, type WorldCatalogue } from "@/lib/world/catalogueLoader";
import type { SiteDetail } from "@/lib/world/catalogueTypes";
import { siteMatches, type SiteFilter } from "@/lib/world/siteFilter";
import { pickedSiteFromDetail, pickedSiteFromRow, rowOfSite } from "@/lib/world/sitePick";

export interface NewsPin {
  site: PickedSite;
  item: NewsItem;
}

const NO_PINS: readonly NewsPin[] = [];

export interface NewsPinState {
  /** Every recent catalogue site, whether or not the current filters hide its dot. */
  pins: readonly NewsPin[];
  /** The same sites, minus any the filters are hiding. These are the rings. */
  rings: readonly NewsPin[];
}

/** Rings for the sites the globe is actually drawing. An outside-core site has no dates loaded, so it follows the undated rule. */
export function newsPinOnGlobe(pin: NewsPin, catalogue: WorldCatalogue, filter: SiteFilter): boolean {
  const row = rowOfSite(catalogue.core, pin.site.id);
  if (row !== null) return siteMatches(catalogue.core, row, filter, catalogue.index.siteTypes);
  if (filter.featuredOnly || filter.types) return false;
  return !filter.range || filter.showUndated;
}

/** Catalogue sites with a report in the window, and which of them the filters leave on the globe. */
export function useNewsPins(catalogue: WorldCatalogue | null, filter: SiteFilter): NewsPinState {
  const asOf = useMemo(() => localIsoDay(new Date()), []);
  const corePins = useMemo(() => (catalogue ? pinsFromCore(catalogue, asOf) : NO_PINS), [catalogue, asOf]);
  const extra = useOutsideCorePins(catalogue, asOf);
  const pins = useMemo(() => mergeNewsPins(corePins, extra), [corePins, extra]);
  const rings = useMemo(
    () => (catalogue ? pins.filter((pin) => newsPinOnGlobe(pin, catalogue, filter)) : NO_PINS),
    [pins, catalogue, filter],
  );
  return useMemo(() => ({ pins, rings }), [pins, rings]);
}

function pinsFromCore(catalogue: WorldCatalogue, asOf: string): readonly NewsPin[] {
  const published = publishedCoreIds(catalogue, asOf);
  return recentNewsSites(NEWS_ITEMS, asOf, published).flatMap((entry) => pinFromCoreRow(catalogue, entry));
}

function pinFromCoreRow(catalogue: WorldCatalogue, entry: RecentNewsSite): NewsPin[] {
  const row = rowOfSite(catalogue.core, entry.siteId);
  return row === null ? [] : [{ site: pickedSiteFromRow(catalogue, row), item: entry.item }];
}

function publishedCoreIds(catalogue: WorldCatalogue, asOf: string): Set<string> {
  const ids = new Set<string>();
  for (const siteId of recentCatalogueIds(asOf)) {
    if (rowOfSite(catalogue.core, siteId) !== null) ids.add(siteId);
  }
  return ids;
}

function recentCatalogueIds(asOf: string): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const item of NEWS_ITEMS) {
    if (!isWithinLastDays(item.date, asOf, NEWS_RECENCY_DAYS)) continue;
    for (const siteId of item.siteIds) {
      if (seen.has(siteId) || !isCatalogueSiteId(siteId)) continue;
      seen.add(siteId);
      ids.push(siteId);
    }
  }
  return ids;
}

function useOutsideCorePins(catalogue: WorldCatalogue | null, asOf: string): readonly NewsPin[] {
  const [pins, setPins] = useState<readonly NewsPin[]>(NO_PINS);
  const missing = useMemo(() => (catalogue ? outsideCoreIds(catalogue, asOf) : []), [catalogue, asOf]);
  useEffect(() => {
    if (!catalogue || missing.length === 0) {
      setPins((current) => (current.length === 0 ? current : NO_PINS));
      return;
    }
    let live = true;
    void loadOutsidePins(missing, asOf).then((loaded) => { if (live) setPins(loaded); });
    return () => { live = false; };
  }, [catalogue, missing, asOf]);
  return pins;
}

function outsideCoreIds(catalogue: WorldCatalogue, asOf: string): readonly string[] {
  return recentCatalogueIds(asOf).filter((siteId) => rowOfSite(catalogue.core, siteId) === null);
}

async function loadOutsidePins(ids: readonly string[], asOf: string): Promise<NewsPin[]> {
  const found = await Promise.all(ids.map(async (siteId) => ({ siteId, detail: await loadSiteDetail(siteId) })));
  const published = new Set(found.flatMap((row) => (row.detail ? [row.siteId] : [])));
  const details = new Map(found.flatMap((row) => (row.detail ? [[row.siteId, row.detail] as const] : [])));
  return recentNewsSites(NEWS_ITEMS, asOf, published).flatMap((entry) => {
    const detail = details.get(entry.siteId);
    return detail ? [pinFromDetail(entry, detail)] : [];
  });
}

function pinFromDetail(entry: RecentNewsSite, detail: SiteDetail): NewsPin {
  return { site: pickedSiteFromDetail(entry.siteId, detail), item: entry.item };
}

function mergeNewsPins(corePins: readonly NewsPin[], extra: readonly NewsPin[]): readonly NewsPin[] {
  if (extra.length === 0) return corePins;
  const seen = new Set(corePins.map((pin) => pin.site.id));
  return [...corePins, ...extra.filter((pin) => !seen.has(pin.site.id))].sort(newestPinFirst);
}

function newestPinFirst(left: NewsPin, right: NewsPin): number {
  const byDate = right.item.date.localeCompare(left.item.date);
  if (byDate !== 0) return byDate;
  const byItem = left.item.id.localeCompare(right.item.id);
  return byItem !== 0 ? byItem : left.site.id.localeCompare(right.site.id);
}
