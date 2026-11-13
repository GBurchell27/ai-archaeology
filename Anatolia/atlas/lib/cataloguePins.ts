import { boundsContain, lonLatToMercator, sampleMeshHeight, toLocal } from "@/lib/geo";
import type { TerrainGrid } from "@/lib/terrain";
import { isUndatedSpan } from "@/lib/timeline";
import type { AtlasMetadata } from "@/lib/types";
import type { WikiFeature } from "@/lib/wikidata";

export interface CataloguePin {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  longitude: number;
  latitude: number;
  muted: boolean;
}

const PIN_LIFT_M = 30;

/** Project published catalogue places onto the national mesh once. */
export function placeCatalogue(
  sites: readonly WikiFeature[],
  metadata: AtlasMetadata,
  metres: Float32Array,
  origin: [number, number],
  exaggeration: number,
  regional?: TerrainGrid | null,
): CataloguePin[] {
  const placed: CataloguePin[] = [];
  for (const site of sites) {
    placed.push(placePin(site, metadata, metres, origin, exaggeration, regional));
  }
  return placed;
}

function placePin(
  site: WikiFeature,
  metadata: AtlasMetadata,
  metres: Float32Array,
  origin: [number, number],
  exaggeration: number,
  regional?: TerrainGrid | null,
): CataloguePin {
  const [longitude, latitude] = site.geometry.coordinates;
  const [east, north] = lonLatToMercator(longitude, latitude);
  const grid = regional && boundsContain(regional.bounds, east, north) ? regional : metadata;
  const elevation = sampleMeshHeight(grid === regional ? regional.metres : metres, grid.width, grid.height, grid.bounds, east, north);
  const [xCoord, zCoord] = toLocal(longitude, latitude, origin);
  return {
    id: site.id,
    name: site.properties.name,
    x: xCoord,
    y: (elevation - metadata.elevation.min) * exaggeration + PIN_LIFT_M,
    z: zCoord,
    longitude,
    latitude,
    muted: isUndatedSpan(site.properties),
  };
}
