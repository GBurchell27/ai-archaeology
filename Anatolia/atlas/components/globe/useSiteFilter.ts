"use client";

import { useCallback, useMemo, useState } from "react";
import type { WorldCatalogue } from "@/lib/world/catalogueLoader";
import type { SiteColumns } from "@/lib/world/catalogueTypes";
import { countSites, type SiteCounts } from "@/lib/world/siteCounts";
import type { SiteFilter } from "@/lib/world/siteFilter";
import { DEFAULT_SHOW_UNDATED, hiddenTypesFor } from "@/lib/settings/settingsPresets";
import { ALL_TIME, filterRangeFor, type YearSpan } from "@/lib/world/worldEras";

export interface SiteFilterViewModel {
  filter: SiteFilter;
  counts: SiteCounts | null;
  yearSpan: YearSpan;
  showUndated: boolean;
  featuredOnly: boolean;
  /** Site types switched off in the legend. Empty means every type shows. */
  hiddenTypes: ReadonlySet<string>;
  setYearSpan(span: YearSpan): void;
  setShowUndated(show: boolean): void;
  setFeaturedOnly(only: boolean): void;
  toggleType(siteType: string): void;
  /** Show only this type; asking again for the only type showing brings every type back. */
  soloType(siteType: string): void;
  showAllTypes(): void;
  /** Show these types and no others; null brings every type back. A settings preset uses it. */
  showOnlyTypes(onlyTypes: readonly string[] | null): void;
}

const NO_TYPES: ReadonlySet<string> = new Set();

/** The time, type and featured filters for the globe, with the live counts they produce. */
export function useSiteFilter(catalogue: WorldCatalogue | null, loadedCells: readonly SiteColumns[]): SiteFilterViewModel {
  const [yearSpan, setYearSpan] = useState<YearSpan>(ALL_TIME);
  const [showUndated, setShowUndated] = useState(DEFAULT_SHOW_UNDATED);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [hiddenTypes, setHiddenTypes] = useState(NO_TYPES);
  const siteTypes = catalogue?.index.siteTypes;

  const filter = useMemo<SiteFilter>(() => ({
    range: filterRangeFor(yearSpan, showUndated),
    showUndated,
    types: hiddenTypes.size && siteTypes ? new Set(siteTypes.filter((siteType) => !hiddenTypes.has(siteType))) : null,
    featuredOnly,
  }), [yearSpan, showUndated, hiddenTypes, featuredOnly, siteTypes]);

  const counts = useMemo(
    () => (catalogue ? countSites([catalogue.core, ...loadedCells], filter, catalogue.index.siteTypes) : null),
    [catalogue, loadedCells, filter],
  );

  const toggleType = useCallback((siteType: string) => setHiddenTypes((hidden) => {
    const next = new Set(hidden);
    if (!next.delete(siteType)) next.add(siteType);
    return next;
  }), []);
  const soloType = useCallback((siteType: string) => setHiddenTypes((hidden) => {
    const others = (siteTypes ?? []).filter((other) => other !== siteType);
    const alreadySolo = !hidden.has(siteType) && others.every((other) => hidden.has(other));
    return alreadySolo ? NO_TYPES : new Set(others);
  }), [siteTypes]);
  const showAllTypes = useCallback(() => setHiddenTypes(NO_TYPES), []);
  const showOnlyTypes = useCallback((onlyTypes: readonly string[] | null) => {
    const hidden = hiddenTypesFor(onlyTypes, siteTypes ?? []);
    setHiddenTypes(hidden.length ? new Set(hidden) : NO_TYPES);
  }, [siteTypes]);

  return useMemo(() => ({
    filter, counts, yearSpan, showUndated, featuredOnly, hiddenTypes,
    setYearSpan, setShowUndated, setFeaturedOnly, toggleType, soloType, showAllTypes, showOnlyTypes,
  }), [filter, counts, yearSpan, showUndated, featuredOnly, hiddenTypes, toggleType, soloType, showAllTypes, showOnlyTypes]);
}
