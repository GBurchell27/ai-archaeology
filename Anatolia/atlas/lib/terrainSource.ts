import type { DetailRecord } from "@/lib/types";

export type TerrainSourceId = "gem15" | "copernicus";

const TERRAIN_RASTERS = new Set([
  "hillshade",
  "hypsometric",
  "slope",
  "local-relief",
  "multidirectional-hillshade",
  "sky-view-factor",
]);

/** Copernicus keeps the optical layers and swaps the relief rasters and height grid. */
export function resolvePlaceRelief(detail: DetailRecord, source: TerrainSourceId): DetailRecord {
  if (source === "gem15") return detail;
  const fallback = detail.terrain?.copernicus;
  if (!fallback) return detail;
  const rasters = { ...detail.rasters };
  for (const key of TERRAIN_RASTERS) delete rasters[key];
  return {
    ...detail,
    bounds: fallback.bounds,
    width: fallback.width,
    height: fallback.height,
    pixelSizeM: fallback.pixelSizeM,
    elevation: fallback.elevation,
    heightFile: fallback.heightFile,
    rasters: { ...rasters, ...fallback.rasters },
  };
}

export function placeHeightUrl(detail: DetailRecord, siteId: string): string {
  const relative = detail.heightFile ?? `details/${siteId}/height.u16`;
  return `/terrain/${relative}`;
}

export function closeupQuery(siteId: string, part: string, source: TerrainSourceId): string {
  return `id=${encodeURIComponent(siteId)}&part=${part}&terrain=${source}`;
}
