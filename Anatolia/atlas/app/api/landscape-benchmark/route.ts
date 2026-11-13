import metrics from "../../../../eval/metrics.json";
import {
  BENCHMARK_DISTANCES,
  type BenchmarkDistance,
  type RecallEstimate,
  type TerrainBenchmark,
} from "@/lib/landscape";

export const dynamic = "force-static";

type RecallRow = Record<`recall_${BenchmarkDistance}`, number>
  & Record<`recall_${BenchmarkDistance}_ci95`, number[]>
  & Partial<Record<`recall_${BenchmarkDistance}_count`, number>>;

function estimate(row: RecallRow, total: number, distance: BenchmarkDistance): RecallEstimate {
  const [low, high] = row[`recall_${distance}_ci95`];
  const recovered = row[`recall_${distance}_count`] ?? Math.round(total * row[`recall_${distance}`]);
  return { total, recovered, interval: [low, high] };
}

function compare(tell: RecallRow, tellCount: number, log: RecallRow, logCount: number) {
  return Object.fromEntries(BENCHMARK_DISTANCES.map((distance) => [distance, {
    tell: estimate(tell, tellCount, distance),
    log: estimate(log, logCount, distance),
  }])) as TerrainBenchmark["results"]["all"];
}

export function GET() {
  const log = metrics.comparison.log_strength;
  const mound = metrics.by_terrain.mound;
  const urban = metrics.by_terrain.urban;
  const baselineMound = log.by_terrain.mound;
  const baselineUrban = log.by_terrain.urban;
  const aggregate: TerrainBenchmark = {
    densityCap: metrics.design.density_cap_per_100km2,
    results: {
      all: compare(metrics, metrics.n_sites, log, log.n_sites),
      mound: compare(mound, mound.n, baselineMound, baselineMound.n),
      urban: compare(urban, urban.n, baselineUrban, baselineUrban.n),
    },
  };
  return Response.json(aggregate);
}
