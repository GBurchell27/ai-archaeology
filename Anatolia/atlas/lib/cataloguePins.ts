import { lonLatToMercator, sampleMeshHeight, toLocal } from "@/lib/geo";
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
}

const PIN_LIFT_M = 30;

/** Project published catalogue places onto the national mesh once. */
export function placeCatalogue(
  sites: readonly WikiFeature[],
  metadata: AtlasMetadata,
  metres: Float32Array,
  origin: [number, number],
  exaggeration: number,
): CataloguePin[] {
  const placed: CataloguePin[] = [];
  for (const site of sites) {
    placed.push(placePin(site, metadata, metres, origin, exaggeration));
  }
  return placed;
}

function placePin(
  site: WikiFeature,
  metadata: AtlasMetadata,
  metres: Float32Array,
  origin: [number, number],
  exaggeration: number,
): CataloguePin {
  const [longitude, latitude] = site.geometry.coordinates;
  const [east, north] = lonLatToMercator(longitude, latitude);
  const elevation = sampleMeshHeight(metres, metadata.width, metadata.height, metadata.bounds, east, north);
  const [xCoord, zCoord] = toLocal(longitude, latitude, origin);
  return {
    id: site.id,
    name: site.properties.name,
    x: xCoord,
    y: (elevation - metadata.elevation.min) * exaggeration + PIN_LIFT_M,
    z: zCoord,
    longitude,
    latitude,
  };
}
