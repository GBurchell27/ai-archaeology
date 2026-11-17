import { decodeHeight, type TerrainGrid } from "@/lib/terrain";

export interface CloseupMeta {
  bounds: [number, number, number, number]; // EPSG:3857
  width: number;
  height: number;
  pixelSizeM: number;
  groundPixelSizeM: number;
  elevation: { min: number; max: number };
  attribution: { relief: string; satellite: string };
}

export interface PlaceTerrain {
  meta: CloseupMeta;
  grid: TerrainGrid;
}

export type PlaceFailure = "outside" | "failed" | "timeout";

export class PlaceTerrainError extends Error {
  constructor(readonly failure: PlaceFailure) {
    super(failure);
  }
}

export const FAILURE_TEXT: Record<PlaceFailure, { title: string; body: string }> = {
  outside: {
    title: "No close-up for this place",
    body: "Close-ups cover published sites between 80° south and 80° north, away from the 180° meridian. This one falls outside that, or is not in the catalogue.",
  },
  failed: {
    title: "The terrain could not be built",
    body: "The open elevation or imagery source did not answer. Nothing is wrong with the site record. Try again in a moment.",
  },
  timeout: {
    title: "The terrain is taking too long",
    body: "Building this window did not finish in time. The data source may be slow. Try again in a moment.",
  },
};

// The server gives its worker 120 s; a little longer here lets its own error arrive first.
const TIMEOUT_MS = 135_000;

export function closeupUrl(siteId: string, part: "meta" | "height" | "hillshade" | "satellite"): string {
  return `/api/closeup?id=${encodeURIComponent(siteId)}&part=${part}`;
}

async function fetchPart(siteId: string, part: "meta" | "height", signal: AbortSignal): Promise<Response> {
  const response = await fetch(closeupUrl(siteId, part), { signal });
  if (!response.ok) throw new PlaceTerrainError(response.status === 404 || response.status === 400 ? "outside" : "failed");
  return response;
}

/** Meta first (it triggers the server build), then the height grid. Rejects with PlaceTerrainError. */
export async function loadPlaceTerrain(siteId: string, cancel: AbortSignal): Promise<PlaceTerrain> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const signal = AbortSignal.any([cancel, timeout]);
  try {
    const meta = (await (await fetchPart(siteId, "meta", signal)).json()) as CloseupMeta;
    const buffer = await (await fetchPart(siteId, "height", signal)).arrayBuffer();
    const metres = decodeHeight(buffer, meta.width, meta.height, meta.elevation.min, meta.elevation.max);
    return { meta, grid: { width: meta.width, height: meta.height, bounds: meta.bounds, metres } };
  } catch (error) {
    if (error instanceof PlaceTerrainError) throw error;
    throw new PlaceTerrainError(timeout.aborted ? "timeout" : "failed");
  }
}
