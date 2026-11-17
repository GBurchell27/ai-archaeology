import { decodeHeight, type TerrainGrid } from "@/lib/terrain";
import { closeupQuery, placeHeightUrl, type TerrainSourceId } from "@/lib/terrainSource";
import type { DetailRecord } from "@/lib/types";

export interface LoadedTerrain {
  id: string;
  source: TerrainSourceId;
  grid: TerrainGrid | null;
  credit?: { relief: string; satellite: string };
}

export class ReliefFetchError extends Error {
  constructor(readonly status: number) {
    super("relief-unavailable");
  }
}

export async function loadTerrain(
  id: string,
  detail: DetailRecord | undefined,
  source: TerrainSourceId,
  signal: AbortSignal,
): Promise<LoadedTerrain> {
  let meta = detail as (DetailRecord & { attribution?: { relief?: string; satellite?: string } }) | undefined;
  if (!meta) {
    const response = await fetch(`/api/closeup?${closeupQuery(id, "meta", source)}`, { signal });
    if (!response.ok) throw new ReliefFetchError(response.status);
    meta = await response.json() as NonNullable<typeof meta>;
  }
  const path = detail
    ? placeHeightUrl(detail, id)
    : `/api/closeup?${closeupQuery(id, "height", source)}`;
  const response = await fetch(path, { signal });
  if (!response.ok) throw new ReliefFetchError(response.status);
  const { width, height, bounds, elevation, attribution } = meta;
  const metres = decodeHeight(await response.arrayBuffer(), width, height, elevation.min, elevation.max);
  return {
    id,
    source,
    grid: { width, height, bounds, metres },
    credit: attribution ? { relief: attribution.relief ?? "", satellite: attribution.satellite ?? "" } : undefined,
  };
}
