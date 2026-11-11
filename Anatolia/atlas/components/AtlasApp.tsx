"use client";

import { useEffect, useMemo, useState } from "react";
import { AtlasScene, type CameraPose } from "@/components/AtlasScene";
import { boundsCenter, lonLatToMercator, sampleHeight, toLocal } from "@/lib/geo";
import { LAYER_STYLE, PERIODS, formatYear, periodOverlaps } from "@/lib/periods";
import { decodeHeight } from "@/lib/terrain";
import type { AtlasMetadata, BaseMap, SiteCollection, SiteFeature } from "@/lib/types";
import type { TerrainGrid } from "@/lib/terrain";

const RASTER_TITLES: Record<string, string> = {
  hillshade: "Hillshade",
  "multidirectional-hillshade": "Multi-directional hillshade",
  slope: "Slope",
  "local-relief": "Local relief",
  "sky-view-factor": "Sky-view factor",
  "true-colour": "Sentinel-2 true colour",
  "false-colour": "Sentinel-2 false colour",
  ndvi: "NDVI",
  hypsometric: "Hypsometric tint",
};

export function AtlasApp() {
  const [metadata, setMetadata] = useState<AtlasMetadata | null>(null);
  const [sites, setSites] = useState<SiteFeature[]>([]);
  const [metres, setMetres] = useState<Float32Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [periodId, setPeriodId] = useState("all");
  const [layers, setLayers] = useState({ neolithic: true, crusader: true });
  const [baseMap, setBaseMap] = useState<BaseMap>("hypsometric");
  const [exaggeration, setExaggeration] = useState(8);
  const [azimuth, setAzimuth] = useState(315);
  const [altitude, setAltitude] = useState(40);
  const [labels, setLabels] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pose, setPose] = useState<CameraPose | null>(null);
  const [detailGrid, setDetailGrid] = useState<TerrainGrid | null>(null);
  const [detailLayer, setDetailLayer] = useState("hillshade");
  const [compare, setCompare] = useState(false);
  const [compareLayer, setCompareLayer] = useState("true-colour");
  const [split, setSplit] = useState(0.5);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    let cancel = false;
    Promise.all([
      fetch("/terrain/metadata.json").then((response) => response.json() as Promise<AtlasMetadata>),
      fetch("/sites.geojson").then((response) => response.json() as Promise<SiteCollection>),
    ]).then(async ([atlas, collection]) => {
      const response = await fetch(`/terrain/${atlas.heightFile}`);
      const grid = decodeHeight(
        await response.arrayBuffer(),
        atlas.width,
        atlas.height,
        atlas.elevation.min,
        atlas.elevation.max,
      );
      if (cancel) {
        return;
      }
      setMetadata(atlas);
      setSites(collection.features);
      setMetres(grid);
      setPose(overviewPose(atlas, 0));
      document.body.dataset.ready = "true";
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "The atlas failed to load");
    });
    return () => {
      cancel = true;
    };
  }, []);

  const period = PERIODS.find((item) => item.id === periodId) ?? PERIODS[0];
  const visible = useMemo(
    () => sites.filter((site) => layers[site.properties.layer] && periodOverlaps(site, period)),
    [sites, layers, period],
  );
  const selected = sites.find((site) => site.id === selectedId) ?? null;
  const detail = selected && metadata ? metadata.details[selected.id] : undefined;

  useEffect(() => {
    if (!metadata || !detail || !selected) {
      setDetailGrid(null);
      return;
    }
    let cancel = false;
    fetch(`/terrain/details/${selected.id}/height.u16`).then(async (response) => {
      const grid = decodeHeight(
        await response.arrayBuffer(),
        detail.width,
        detail.height,
        detail.elevation.min,
        detail.elevation.max,
      );
      if (!cancel) {
        setDetailGrid({
          width: detail.width,
          height: detail.height,
          bounds: detail.bounds,
          metres: grid,
        });
      }
    }).catch(() => setDetailGrid(null));
    return () => {
      cancel = true;
    };
  }, [metadata, selected, detail]);

  useEffect(() => {
    document.body.dataset.site = selectedId ?? "";
    document.body.dataset.settings = settingsOpen ? "open" : "closed";
    document.body.dataset.panel = selected ? "open" : "closed";
    document.body.dataset.base = baseMap;
    document.body.dataset.neolithic = layers.neolithic ? "on" : "off";
    document.body.dataset.crusader = layers.crusader ? "on" : "off";
  }, [selectedId, settingsOpen, selected, baseMap, layers]);

  if (error) {
    return <p className="status">{error}</p>;
  }
  if (!metadata || !metres || !pose) {
    return <p className="status">Loading the Turkey terrain…</p>;
  }

  const matches = query.trim().length < 2 ? [] : sites.filter((site) => {
    const needle = query.trim().toLowerCase();
    return site.properties.names.some((name) => name.toLowerCase().includes(needle));
  }).slice(0, 8);

  function flyTo(site: SiteFeature) {
    const next = sitePose(site, metadata!, metres!, exaggeration, pose!.token + 1);
    setPose(next);
    setSelectedId(site.id);
    setSettingsOpen(false);
    setQuery("");
    const rasters = metadata!.details[site.id]?.rasters ?? {};
    setDetailLayer(preferredLayer(rasters, baseMap));
    setCompare(false);
  }

  function backToTurkey() {
    setSelectedId(null);
    setPose(overviewPose(metadata!, pose!.token + 1));
    setSettingsOpen(false);
  }

  const rasterEntries = Object.entries(detail?.rasters ?? {});
  const detailUrl = detail?.rasters[detailLayer] ? `/terrain/${detail.rasters[detailLayer]}` : null;
  const compareUrl = detail?.rasters[compareLayer] ? `/terrain/${detail.rasters[compareLayer]}` : null;

  return (
    <div className="atlas">
      <AtlasScene
        metadata={metadata}
        metres={metres}
        sites={visible}
        baseMap={baseMap}
        exaggeration={exaggeration}
        azimuth={azimuth}
        altitude={altitude}
        labels={labels}
        selectedId={selectedId}
        pose={pose}
        detail={detailGrid}
        detailUrl={detailUrl}
        compareUrl={compare ? compareUrl : null}
        compare={compare}
        split={split}
        opacity={opacity}
        onSelect={(siteId) => {
          const site = sites.find((item) => item.id === siteId);
          if (site) {
            flyTo(site);
          }
        }}
      />
      <header className="topbar">
        <button type="button" className="brand" data-action="overview" aria-label="Back to Turkey" onClick={backToTurkey}>Turkey</button>
        <div className="chips">
          {PERIODS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === periodId ? "chip is-on" : "chip"}
              data-period={item.id}
              onClick={() => setPeriodId(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <form className="search" onSubmit={(event) => event.preventDefault()}>
          <input
            value={query}
            placeholder="Search places"
            aria-label="Search places"
            data-role="search"
            onChange={(event) => setQuery(event.target.value)}
          />
          {matches.length > 0 ? (
            <ul>
              {matches.map((site) => (
                <li key={site.id}>
                  <button type="button" data-result={site.id} onClick={() => flyTo(site)}>{site.properties.name}</button>
                </li>
              ))}
            </ul>
          ) : null}
        </form>
        <button type="button" className="icon-button" aria-label="Settings" data-action="settings" onClick={() => setSettingsOpen((open) => !open)}>
          <GearIcon />
        </button>
      </header>
      {settingsOpen ? (
        <SettingsMenu
          baseMap={baseMap}
          layers={layers}
          exaggeration={exaggeration}
          azimuth={azimuth}
          altitude={altitude}
          labels={labels}
          onBase={setBaseMap}
          onLayer={(layer, enabled) => setLayers((current) => ({ ...current, [layer]: enabled }))}
          onExaggeration={setExaggeration}
          onAzimuth={setAzimuth}
          onAltitude={setAltitude}
          onLabels={setLabels}
        />
      ) : null}
      {selected ? (
        <SitePanel
          site={selected}
          rasters={rasterEntries}
          detailLayer={detailLayer}
          compare={compare}
          compareLayer={compareLayer}
          split={split}
          opacity={opacity}
          onClose={() => setSelectedId(null)}
          onLayer={setDetailLayer}
          onCompare={setCompare}
          onCompareLayer={setCompareLayer}
          onSplit={setSplit}
          onOpacity={setOpacity}
        />
      ) : null}
      <div className="legend">
        <span><span className="swatch" style={{ background: LAYER_STYLE.neolithic.color }} /> Neolithic</span>
        <span><span className="swatch" style={{ background: LAYER_STYLE.crusader.color }} /> Crusader</span>
        <span><span className="open-ring" /> approximate</span>
      </div>
      <p className="credit">{metadata.attribution.dem} {metadata.attribution.satellite}</p>
    </div>
  );
}

function SettingsMenu(props: {
  baseMap: BaseMap;
  layers: { neolithic: boolean; crusader: boolean };
  exaggeration: number;
  azimuth: number;
  altitude: number;
  labels: boolean;
  onBase: (base: BaseMap) => void;
  onLayer: (layer: "neolithic" | "crusader", enabled: boolean) => void;
  onExaggeration: (value: number) => void;
  onAzimuth: (value: number) => void;
  onAltitude: (value: number) => void;
  onLabels: (value: boolean) => void;
}) {
  return (
    <aside className="menu" aria-label="Settings">
      <h2>Map</h2>
      {(["hypsometric", "relief", "satellite"] as BaseMap[]).map((base) => (
        <label className="check" key={base}>
          <input type="radio" name="base" checked={props.baseMap === base} data-base={base} onChange={() => props.onBase(base)} />
          <span>{base === "relief" ? "Shaded relief" : base === "hypsometric" ? "Hypsometric tint" : "Satellite"}</span>
        </label>
      ))}
      <h2>Places</h2>
      <label className="check">
        <input type="checkbox" checked={props.layers.neolithic} data-layer-toggle="neolithic" onChange={(event) => props.onLayer("neolithic", event.target.checked)} />
        <span className="swatch" style={{ background: LAYER_STYLE.neolithic.color }} /> Neolithic
      </label>
      <label className="check">
        <input type="checkbox" checked={props.layers.crusader} data-layer-toggle="crusader" onChange={(event) => props.onLayer("crusader", event.target.checked)} />
        <span className="swatch" style={{ background: LAYER_STYLE.crusader.color }} /> Crusader era
      </label>
      <label>Exaggeration <input type="range" min={1} max={16} step={0.5} value={props.exaggeration} data-role="exaggeration" onChange={(event) => props.onExaggeration(Number(event.target.value))} /></label>
      <label>Sun azimuth <input type="range" min={0} max={360} value={props.azimuth} data-role="azimuth" onChange={(event) => props.onAzimuth(Number(event.target.value))} /></label>
      <label>Sun altitude <input type="range" min={8} max={80} value={props.altitude} data-role="altitude" onChange={(event) => props.onAltitude(Number(event.target.value))} /></label>
      <label className="check">
        <input type="checkbox" checked={props.labels} data-role="labels" onChange={(event) => props.onLabels(event.target.checked)} />
        Place names
      </label>
    </aside>
  );
}

function SitePanel(props: {
  site: SiteFeature;
  rasters: [string, string][];
  detailLayer: string;
  compare: boolean;
  compareLayer: string;
  split: number;
  opacity: number;
  onClose: () => void;
  onLayer: (layer: string) => void;
  onCompare: (enabled: boolean) => void;
  onCompareLayer: (layer: string) => void;
  onSplit: (value: number) => void;
  onOpacity: (value: number) => void;
}) {
  const properties = props.site.properties;
  return (
    <aside className="panel" aria-label="Selected place">
      <button type="button" className="close" data-action="close-panel" onClick={props.onClose}>Close</button>
      <h2>{properties.name}</h2>
      <p className="muted">{properties.names.join(" · ")}</p>
      <p className="badge">{properties.confidence === "approximate" ? "Approximate location" : "Published location"} · {properties.category}</p>
      <p>{properties.period}. {formatYear(properties.startYear)} – {formatYear(properties.endYear)}.</p>
      <p>{properties.description}</p>
      <p>{properties.notes}</p>
      <p><a href={properties.sourceUrl} target="_blank" rel="noreferrer">{properties.source}</a></p>
      {props.rasters.length > 0 ? (
        <>
          <h2>This place</h2>
          {props.rasters.map(([id]) => (
            <label className="check" key={id}>
              <input type="radio" name="detail" checked={props.detailLayer === id} data-detail-layer={id} onChange={() => props.onLayer(id)} />
              {RASTER_TITLES[id] ?? id}
            </label>
          ))}
          <label>Opacity <input type="range" min={0.2} max={1} step={0.05} value={props.opacity} data-role="opacity" onChange={(event) => props.onOpacity(Number(event.target.value))} /></label>
          <label className="check">
            <input type="checkbox" checked={props.compare} data-role="compare" onChange={(event) => props.onCompare(event.target.checked)} />
            Compare
          </label>
          <select value={props.compareLayer} data-role="compare-layer" onChange={(event) => props.onCompareLayer(event.target.value)}>
            {props.rasters.map(([id]) => <option key={id} value={id}>{RASTER_TITLES[id] ?? id}</option>)}
          </select>
          <label>Swipe <input type="range" min={0} max={100} value={props.split * 100} data-role="swipe" onChange={(event) => props.onSplit(Number(event.target.value) / 100)} /></label>
        </>
      ) : null}
    </aside>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="2.2" />
      <path d="M8 1.5v2.2M8 12.3v2.2M1.5 8h2.2M12.3 8h2.2M3.4 3.4l1.6 1.6M11 11l1.6 1.6M12.6 3.4 11 5M5 11l-1.6 1.6" />
    </svg>
  );
}

function overviewPose(metadata: AtlasMetadata, token: number): CameraPose {
  const width = metadata.bounds[2] - metadata.bounds[0];
  const depth = metadata.bounds[3] - metadata.bounds[1];
  return {
    position: [0, width * 0.62, depth * 0.22],
    target: [0, 0, -depth * 0.04],
    token,
  };
}

function sitePose(site: SiteFeature, metadata: AtlasMetadata, metres: Float32Array, exaggeration: number, token: number): CameraPose {
  const origin = boundsCenter(metadata.bounds);
  const [longitude, latitude] = site.geometry.coordinates;
  const [east, north] = lonLatToMercator(longitude, latitude);
  const elevation = sampleHeight(metres, metadata.width, metadata.height, metadata.bounds, east, north);
  const [xCoord, zCoord] = toLocal(longitude, latitude, origin);
  const yCoord = (elevation - metadata.elevation.min) * exaggeration;
  const detail = metadata.details[site.id];
  const fine = Boolean(detail && detail.pixelSizeM < 80);
  const distance = fine ? 9000 : detail ? 24000 : 70000;
  return {
    position: [xCoord + distance * 0.12, yCoord + distance * 0.42, zCoord + distance * 0.72],
    target: [xCoord, yCoord + 80, zCoord],
    token,
  };
}

function preferredLayer(rasters: Record<string, string>, baseMap: BaseMap): string {
  if (baseMap === "satellite" && rasters["true-colour"]) {
    return "true-colour";
  }
  if (baseMap === "hypsometric" && rasters.hypsometric) {
    return "hypsometric";
  }
  if (rasters.hillshade) {
    return "hillshade";
  }
  return Object.keys(rasters)[0] ?? "hillshade";
}
