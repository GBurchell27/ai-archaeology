import { boundsContain, lonLatToMercator, sampleHeight } from "./geo";
import { datedSpan, spansOverlap, type DatedSpan, type YearRange } from "./timeline";
import type { AtlasMetadata } from "./types";

export const SOUTHEAST_WINDOW: AtlasMetadata["bounds"] = [36.5, 36.5, 42, 39];

export const ELEVATION_BANDS = [
  { upper: 250, label: "Below 250" },
  { upper: 500, label: "250–499" },
  { upper: 750, label: "500–749" },
  { upper: 1000, label: "750–999" },
  { upper: 1500, label: "1,000–1,499" },
  { upper: Infinity, label: "1,500 and above" },
] as const;

interface PublishedPlace {
  geometry: { coordinates: [number, number] };
  properties: DatedSpan;
}

interface TerrainSample {
  inSoutheast: boolean;
  span: [number, number] | null;
  elevation: number | null;
}

export function samplePublishedPlaces(
  places: readonly PublishedPlace[],
  grid: Pick<AtlasMetadata, "width" | "height" | "bounds">,
  metres: Float32Array,
): TerrainSample[] {
  return places.map(({ geometry, properties }) => {
    const [longitude, latitude] = geometry.coordinates;
    const [east, north] = lonLatToMercator(longitude, latitude);
    const height = boundsContain(grid.bounds, east, north)
      ? sampleHeight(metres, grid.width, grid.height, grid.bounds, east, north)
      : NaN;
    return {
      inSoutheast: boundsContain(SOUTHEAST_WINDOW, longitude, latitude),
      span: datedSpan(properties),
      elevation: Number.isFinite(height) ? height : null,
    };
  });
}

export function summarizeElevation(
  samples: readonly TerrainSample[],
  scope: "southeast" | "atlas",
  range: YearRange,
  includeUndated: boolean,
) {
  const bins: number[] = ELEVATION_BANDS.map(() => 0);
  const elevations: number[] = [];
  let total = 0;
  let inRange = 0;
  let undated = 0;
  let selected = 0;
  for (const sample of samples) {
    if (scope === "southeast" && !sample.inSoutheast) continue;
    total += 1;
    if (sample.span) {
      if (!spansOverlap(sample.span[0], sample.span[1], range)) continue;
      inRange += 1;
    } else {
      undated += 1;
      if (!includeUndated) continue;
    }
    selected += 1;
    const { elevation } = sample;
    if (elevation === null) continue;
    elevations.push(elevation);
    const band = ELEVATION_BANDS.findIndex(({ upper }) => elevation < upper);
    bins[band] += 1;
  }
  elevations.sort((left, right) => left - right);
  const length = elevations.length;
  const midpoint = Math.floor(length / 2);
  const median = length === 0
    ? null
    : (elevations[Math.floor((length - 1) / 2)] + elevations[midpoint]) / 2;
  return { total, inRange, undated, selected, sampled: length, bins, median };
}

export const BENCHMARK_DISTANCES = [250, 500, 1000] as const;
export type BenchmarkDistance = typeof BENCHMARK_DISTANCES[number];
export type BenchmarkCohort = "all" | "mound" | "urban";

export interface RecallEstimate {
  recovered: number;
  total: number;
  interval: [number, number];
}

export interface TerrainBenchmark {
  densityCap: number;
  results: Record<BenchmarkCohort, Record<BenchmarkDistance, {
    tell: RecallEstimate;
    log: RecallEstimate;
  }>>;
}
