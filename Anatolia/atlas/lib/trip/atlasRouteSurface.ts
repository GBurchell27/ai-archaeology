import { boundsContain, detailClipRect, lonLatToMercator, sampleMeshHeight, toLocal } from "@/lib/geo";
import type { RouteSurface } from "@/lib/trip/tripRoute";
import type { AtlasMetadata } from "@/lib/types";

const FLIGHT_MARGIN_M = 60_000;

/** Drapes routes on the national terrain. Places off the map, like Amsterdam, sit at the datum. */
export function atlasRouteSurface(
  metadata: AtlasMetadata,
  metres: Float32Array,
  origin: [number, number],
  exaggeration: number,
): RouteSurface {
  const terrain = detailClipRect(metadata.bounds, origin, 0);
  return {
    toLocal: ([longitude, latitude]) => toLocal(longitude, latitude, origin),
    groundY: ([longitude, latitude]) => {
      const [east, north] = lonLatToMercator(longitude, latitude);
      if (!boundsContain(metadata.bounds, east, north)) return 0;
      const elevation = sampleMeshHeight(metres, metadata.width, metadata.height, metadata.bounds, east, north);
      return Math.max(0, (elevation - metadata.elevation.min) * exaggeration);
    },
    frame: {
      minX: terrain.minX - FLIGHT_MARGIN_M,
      maxX: terrain.maxX + FLIGHT_MARGIN_M,
      minZ: terrain.minZ - FLIGHT_MARGIN_M,
      maxZ: terrain.maxZ + FLIGHT_MARGIN_M,
    },
  };
}
