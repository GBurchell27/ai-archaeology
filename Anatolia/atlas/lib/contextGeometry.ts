import { sampleMeshHeight } from "@/lib/geo";
import type { AtlasMetadata } from "@/lib/types";

type Position = [number, number] | [number, number, number];
type Geometry = {
  type: string;
  coordinates: unknown;
};

export interface ContextFeature {
  geometry: Geometry;
  properties: Record<string, unknown>;
}

/** Local line positions, lifted onto the national surface. */
export function contextSegments(
  features: ContextFeature[],
  origin: [number, number],
  metadata: AtlasMetadata,
  metres: Float32Array,
  exaggeration: number,
): Float32Array {
  const positions: number[] = [];
  for (const feature of features) {
    for (const line of linesOf(feature.geometry)) {
      appendLine(positions, line, origin, metadata, metres, exaggeration);
    }
  }
  return new Float32Array(positions);
}

function linesOf(geometry: Geometry): Position[][] {
  if (geometry.type === "LineString") return [geometry.coordinates as Position[]];
  if (geometry.type === "MultiLineString") return geometry.coordinates as Position[][];
  if (geometry.type === "Polygon") return (geometry.coordinates as Position[][]).slice(0, 1);
  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates as Position[][][]).map((polygon) => polygon[0]);
  }
  return [];
}

function appendLine(
  positions: number[],
  line: Position[],
  origin: [number, number],
  metadata: AtlasMetadata,
  metres: Float32Array,
  exaggeration: number,
) {
  for (let index = 1; index < line.length; index += 1) {
    positions.push(...vertex(line[index - 1], origin, metadata, metres, exaggeration));
    positions.push(...vertex(line[index], origin, metadata, metres, exaggeration));
  }
}

function vertex(
  point: Position,
  origin: [number, number],
  metadata: AtlasMetadata,
  metres: Float32Array,
  exaggeration: number,
): [number, number, number] {
  const [longitude, latitude] = point;
  const radius = 6378137;
  const east = radius * (longitude * Math.PI) / 180;
  const north = radius * Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360));
  const elevation = sampleMeshHeight(
    metres, metadata.width, metadata.height, metadata.bounds, east, north,
  );
  return [
    east - origin[0],
    (elevation - metadata.elevation.min) * exaggeration + 40,
    -(north - origin[1]),
  ];
}
