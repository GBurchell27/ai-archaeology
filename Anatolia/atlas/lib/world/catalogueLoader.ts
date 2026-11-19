"use client";

import { useEffect, useState } from "react";
import type { PickedSite } from "@/lib/globe/siteBlock";
import {
  cellKeyFor, detailBucket, siteDetailFromStored, type FeaturedSite, type SiteColumns, type SiteDetail, type StoredSiteDetail, type WorldIndex,
} from "./catalogueTypes";
import { pickedSiteFromColumns, pickedSiteFromDetail, rowOfSite } from "./sitePick";

export interface WorldCatalogue {
  index: WorldIndex;
  core: SiteColumns;
  featured: FeaturedSite[];
}

const WORLD_ROOT = "/world/";

/** One static catalogue file; null when it is not there. */
export async function fetchWorldFile<Shape>(file: string, signal?: AbortSignal): Promise<Shape | null> {
  const response = await fetch(WORLD_ROOT + file, { signal });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  return await response.json() as Shape;
}

let catalogueRequest: Promise<WorldCatalogue> | null = null;

function loadWorldCatalogue(): Promise<WorldCatalogue> {
  catalogueRequest ??= Promise.all([
    fetchWorldFile<WorldIndex>("index.json"),
    fetchWorldFile<SiteColumns>("core.json"),
    fetchWorldFile<FeaturedSite[]>("featured.json"),
  ]).then(([index, core, featured]) => {
    if (!index || !core) throw new Error("The site catalogue has not been built yet.");
    return { index, core, featured: featured ?? [] };
  });
  // A failed load may be retried by the next mount.
  catalogueRequest.catch(() => { catalogueRequest = null; });
  return catalogueRequest;
}

/**
 * `deferMs` holds the first request back that long, for a view that is ready without the catalogue: its
 * 2.6 MB file then cannot keep that view's own loading from finishing. A request already made is joined at once.
 */
export function useWorldCatalogue(deferMs = 0): { catalogue: WorldCatalogue | null; error: string | null } {
  const [state, setState] = useState<{ catalogue: WorldCatalogue | null; error: string | null }>(
    { catalogue: null, error: null },
  );
  useEffect(() => {
    let live = true;
    const join = () => loadWorldCatalogue().then(
      (catalogue) => { if (live) setState({ catalogue, error: null }); },
      (reason: unknown) => {
        if (live) setState({ catalogue: null, error: reason instanceof Error ? reason.message : "Could not load the site catalogue." });
      },
    );
    const timer = window.setTimeout(join, catalogueRequest ? 0 : deferMs);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [deferMs]);
  return state;
}

const detailBuckets = new Map<string, Promise<Record<string, StoredSiteDetail>>>();

/** detail/<bucket>.json, fetched once per bucket. */
export async function loadSiteDetail(id: string): Promise<SiteDetail | null> {
  const bucket = detailBucket(id);
  let request = detailBuckets.get(bucket);
  if (!request) {
    request = fetchWorldFile<Record<string, StoredSiteDetail>>(`detail/${bucket}.json`).then((sites) => sites ?? {});
    detailBuckets.set(bucket, request);
    request.catch(() => detailBuckets.delete(bucket));
  }
  try {
    const stored = (await request)[id];
    return stored ? siteDetailFromStored(id, stored) : null;
  } catch {
    return null;
  }
}

/**
 * A site that is not in core.json, with its own type and dates: an OpenStreetMap megalith from that
 * layer's file, anything else from the 10° cell its detail record places it in. Null for an unknown id.
 */
export async function loadSiteOutsideCore(catalogue: WorldCatalogue, id: string): Promise<PickedSite | null> {
  const detail = await loadSiteDetail(id);
  const osmFile = id.startsWith("osm-") ? catalogue.index.osmMegaliths?.file : undefined;
  const file = osmFile ?? (detail ? `cells/${cellKeyFor(detail.lon, detail.lat)}.json` : null);
  const columns = file ? await fetchWorldFile<SiteColumns>(file).catch(() => null) : null;
  const row = columns ? rowOfSite(columns, id) : null;
  if (columns && row !== null) return pickedSiteFromColumns(columns, row, catalogue.index);
  return detail ? pickedSiteFromDetail(id, detail) : null;
}
