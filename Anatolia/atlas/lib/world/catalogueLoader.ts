"use client";

import { useEffect, useState } from "react";
import {
  detailBucket, siteDetailFromStored, type FeaturedSite, type SiteColumns, type SiteDetail, type StoredSiteDetail, type WorldIndex,
} from "./catalogueTypes";

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

export function useWorldCatalogue(): { catalogue: WorldCatalogue | null; error: string | null } {
  const [state, setState] = useState<{ catalogue: WorldCatalogue | null; error: string | null }>(
    { catalogue: null, error: null },
  );
  useEffect(() => {
    let live = true;
    loadWorldCatalogue().then(
      (catalogue) => { if (live) setState({ catalogue, error: null }); },
      (reason: unknown) => {
        if (live) setState({ catalogue: null, error: reason instanceof Error ? reason.message : "Could not load the site catalogue." });
      },
    );
    return () => { live = false; };
  }, []);
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
    return stored ? siteDetailFromStored(stored) : null;
  } catch {
    return null;
  }
}
