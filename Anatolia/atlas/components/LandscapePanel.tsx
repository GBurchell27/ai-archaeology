"use client";

import { useEffect, useMemo, useState } from "react";
import { SafeLink } from "@/components/SafeLink";
import {
  BENCHMARK_DISTANCES,
  ELEVATION_BANDS,
  SOUTHEAST_WINDOW,
  samplePublishedPlaces,
  summarizeElevation,
  type BenchmarkCohort,
  type BenchmarkDistance,
  type RecallEstimate,
  type TerrainBenchmark,
} from "@/lib/landscape";
import { formatYear } from "@/lib/periods";
import type { YearRange } from "@/lib/timeline";
import type { AtlasMetadata, SiteFeature } from "@/lib/types";
import type { WikiFeature } from "@/lib/wikidata";
import styles from "./LandscapePanel.module.css";

const number = new Intl.NumberFormat("en");
const percent = new Intl.NumberFormat("en", { style: "percent" });
const COPERNICUS_DEM = "https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM";
const [west, south, east, north] = SOUTHEAST_WINDOW;

interface LandscapePanelProps {
  sites: readonly SiteFeature[];
  catalogue: readonly WikiFeature[];
  range: YearRange;
  metadata: AtlasMetadata;
  metres: Float32Array;
  onClose: () => void;
}

export function LandscapePanel({ onClose, ...props }: LandscapePanelProps) {
  const [view, setView] = useState<"elevation" | "benchmark">("elevation");
  return (
    <aside className={styles.panel} aria-labelledby="landscape-title" data-role="landscape">
      <header className={styles.header}>
        <h1 id="landscape-title">Landscape research</h1>
        <button className={styles.close} type="button" aria-label="Close landscape research" onClick={onClose}>×</button>
      </header>
      <div className={styles.views} role="group" aria-label="Landscape research views">
        <button type="button" aria-pressed={view === "elevation"} onClick={() => setView("elevation")}>Elevation</button>
        <button type="button" aria-pressed={view === "benchmark"} onClick={() => setView("benchmark")}>Model benchmark</button>
      </div>
      {view === "elevation" ? <ElevationView {...props} /> : <BenchmarkView />}
    </aside>
  );
}

type ElevationProps = Omit<LandscapePanelProps, "onClose">;
type PlaceSource = "curated" | "Pleiades" | "Wikidata";

function ElevationView({ sites, catalogue, range, metadata, metres }: ElevationProps) {
  const [scope, setScope] = useState<"southeast" | "atlas">("southeast");
  const [source, setSource] = useState<PlaceSource>("curated");
  const [includeUndated, setIncludeUndated] = useState(false);
  const samples = useMemo(() => {
    const places = source === "curated" ? sites : catalogue.filter((site) => site.properties.source === source);
    return samplePublishedPlaces(places, metadata, metres);
  }, [source, sites, catalogue, metadata, metres]);
  const result = useMemo(
    () => summarizeElevation(samples, scope, range, includeUndated),
    [samples, scope, range, includeUndated],
  );
  const period = range.start === range.end
    ? formatYear(range.start)
    : `${formatYear(range.start)} – ${formatYear(range.end)}`;
  const roundedMedian = result.median === null ? null : Math.round(result.median / 50) * 50;

  return (
    <section className={styles.view} aria-labelledby="elevation-title">
      <h2 id="elevation-title">Published place elevation</h2>
      <p>Change the timeline to compare where places recorded for different periods sit in today’s landscape.</p>
      <div className={styles.filters}>
        <label>Area
          <select value={scope} onChange={(event) => setScope(event.target.value as typeof scope)}>
            <option value="southeast">Southeastern window</option>
            <option value="atlas">Entire atlas</option>
          </select>
        </label>
        <label>Place records
          <select value={source} onChange={(event) => setSource(event.target.value as PlaceSource)}>
            <option value="curated">Curated atlas</option>
            <option value="Pleiades">Pleiades</option>
            <option value="Wikidata">Wikidata</option>
          </select>
        </label>
      </div>
      <label className={styles.check}>
        <input type="checkbox" checked={includeUndated} onChange={(event) => setIncludeUndated(event.target.checked)} />
        Include undated records
      </label>
      <div className={styles.result} aria-live="polite">
        <p className={styles.period}>{period}</p>
        <div className={styles.summary}>
          <div><strong>{number.format(result.sampled)}</strong><span>elevations sampled</span></div>
          <div><strong>{roundedMedian === null ? "—" : `≈ ${number.format(roundedMedian)} m`}</strong><span>median elevation</span></div>
        </div>
        <p className={styles.note}>
          {number.format(result.inRange)} dated in range · {number.format(result.undated)} undated · {number.format(result.total)} total in area
          {result.selected > result.sampled ? ` · ${number.format(result.selected - result.sampled)} selected outside available terrain` : ""}
        </p>
      </div>
      {result.sampled > 0 ? (
        <figure className={styles.chart}>
          <figcaption>Elevation band <span>Share of sampled records</span></figcaption>
          <ul>
            {ELEVATION_BANDS.map(({ label }, index) => {
              const count = result.bins[index];
              const share = count / result.sampled;
              return (
                <li key={label}>
                  <span>{label} m</span>
                  <span className={styles.track} aria-hidden="true"><i style={{ width: `${share * 100}%` }} /></span>
                  <span className={styles.bandCount}>{number.format(count)} <small>({percent.format(share)})</small></span>
                </li>
              );
            })}
          </ul>
        </figure>
      ) : <p className={styles.note}>No terrain samples for these filters.</p>}
      <details className={styles.details}>
        <summary>Data and coverage</summary>
        <p>
          The southeastern study window spans {west}–{east}° E and {south}–{north}° N. The entire atlas uses its national map extent.
          Place locations and dates inherit publication, mapping, and dating gaps.
        </p>
        <p>
          Elevations use the atlas’s downsampled <SafeLink href={COPERNICUS_DEM}>Copernicus DEM GLO-90</SafeLink> grid
          at approximately {(metadata.pixelSizeM / 1000).toFixed(1)} km projected spacing. The surface reflects present-day conditions.
          Approximate place locations and the coarse grid can put individual records in adjacent bands.
        </p>
        <p>
          The bundled catalogue uses <SafeLink href="https://pleiades.stoa.org/">Pleiades</SafeLink> (CC BY 3.0 US)
          and <SafeLink href="https://www.wikidata.org/">Wikidata</SafeLink> (CC0). Curated records have individual source credits in their place panels.
        </p>
        <p>{metadata.attribution.dem}</p>
      </details>
    </section>
  );
}

function BenchmarkView() {
  const [cohort, setCohort] = useState<BenchmarkCohort>("all");
  const [distance, setDistance] = useState<BenchmarkDistance>(250);
  const [benchmark, setBenchmark] = useState<TerrainBenchmark | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/landscape-benchmark", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Benchmark unavailable");
        return response.json() as Promise<TerrainBenchmark>;
      })
      .then((data) => {
        if (!controller.signal.aborted) setBenchmark(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, []);

  const result = benchmark?.results[cohort][distance];
  return (
    <section className={styles.view} aria-labelledby="benchmark-title">
      <h2 id="benchmark-title">Held-out terrain benchmark</h2>
      <p>Compare two ways of ranking mound-like landforms by how often they recovered published places in held-out regions.</p>
      {result && benchmark ? (
        <>
          <div className={styles.filters}>
            <label>Published places
              <select value={cohort} onChange={(event) => setCohort(event.target.value as BenchmarkCohort)}>
                <option value="all">All benchmark places</option>
                <option value="mound">Mounds and compact hills</option>
                <option value="urban">Other settings</option>
              </select>
            </label>
            <label>Match distance
              <select value={distance} onChange={(event) => setDistance(Number(event.target.value) as BenchmarkDistance)}>
                {BENCHMARK_DISTANCES.map((value) => <option key={value} value={value}>{number.format(value)} m</option>)}
              </select>
            </label>
          </div>
          <div className={styles.recall} aria-live="polite">
            <RecallBar name="Tell score" estimate={result.tell} />
            <RecallBar name="Laplacian baseline" estimate={result.log} baseline />
          </div>
          <p className={styles.note}>A place counts as recovered if a terrain response falls within the selected distance. Both methods use a cap of {benchmark.densityCap} responses per 100 km².</p>
        </>
      ) : <p role="status">{failed ? "The saved benchmark could not be loaded." : "Loading the saved benchmark…"}</p>}
      <details className={styles.details}>
        <summary>Method and limits</summary>
        <p>
          The test used Copernicus DEM GLO-30 in windows around published places. Each region was held out in turn while the tell
          score was chosen using the other regions. The score uses features such as roundness, summit flatness, flank slope, and local relief.
          The Laplacian baseline ranks by strength of the terrain response.
        </p>
        <p>
          Other settings include cities, castles, flooded places, and rock-cut landscapes. The chart shows Wilson intervals for the
          observed recovery rates. Places in a region can share landscape conditions. Estimating false positives or suitability in a new
          region requires independent survey coverage.
        </p>
      </details>
    </section>
  );
}

function RecallBar({ name, estimate, baseline = false }: { name: string; estimate: RecallEstimate; baseline?: boolean }) {
  const share = estimate.recovered / estimate.total;
  const [low, high] = estimate.interval;
  return (
    <div className={styles.recallRow} data-baseline={baseline}>
      <div><strong>{name}</strong><span>{estimate.recovered}/{estimate.total} ({percent.format(share)})</span></div>
      <div className={styles.track} aria-hidden="true">
        <i style={{ width: `${share * 100}%` }} />
        <b style={{ left: `${low * 100}%`, width: `${(high - low) * 100}%` }} />
      </div>
      <small>95% interval {percent.format(low)}–{percent.format(high)}</small>
    </div>
  );
}
