"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AtlasScene, type CameraPose } from "@/components/AtlasScene";
import { Legend, PeriodDock, ShortcutOverlay, readLegendOpen, storeLegend, useAtlasKeys, useTheme, type AtlasKeyHandlers } from "@/components/AtlasChrome";
import { naturalExaggeration } from "@/lib/exaggeration";
import { boundsCenter, lonLatToMercator, sampleHeight, toLocal } from "@/lib/geo";
import { LAYER_STYLE, PERIODS, formatYear, periodOverlaps } from "@/lib/periods";
import { decodeHeight } from "@/lib/terrain";
import type { AtlasMetadata, BaseMap, LayerId, SiteCollection, SiteFeature } from "@/lib/types";
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
  satellite: "Sentinel-2 cloudless",
};

export function AtlasApp() {
  const [metadata, setMetadata] = useState<AtlasMetadata | null>(null);
  const [sites, setSites] = useState<SiteFeature[]>([]);
  const [metres, setMetres] = useState<Float32Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [periodId, setPeriodId] = useState("all");
  const [layers, setLayers] = useState<Record<LayerId, boolean>>({
    neolithic: true,
    bronze: true,
    classical: true,
    crusader: true,
  });
  const [baseMap, setBaseMap] = useState<BaseMap>("hypsometric");
  const [exaggeration, setExaggeration] = useState(6.5);
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
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [panelShown, setPanelShown] = useState(false);
  const [help, setHelp] = useState(false);
  const [legendOpen, setLegendOpen] = useState(true);
  const [theme, toggleTheme] = useTheme();
  const readoutRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const keys = useRef<AtlasKeyHandlers>({
    onPeriod: () => undefined,
    onLayer: () => undefined,
    onBase: () => undefined,
    onSearch: () => undefined,
    onEscape: () => undefined,
    onReset: () => undefined,
    onTheme: () => undefined,
    onHelp: () => undefined,
  });
  useAtlasKeys(keys);
  useEffect(() => setLegendOpen(readLegendOpen()), []);

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
      setExaggeration(naturalExaggeration(atlas.pixelSizeM));
      setPose(overviewPose(atlas, collection.features, 0));
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
    setBusy(true);
    setReveal(false);
    setPanelShown(false);
    const imageUrl = detail.rasters[detailLayer] ? `/terrain/${detail.rasters[detailLayer]}` : "";
    const image = new Image();
    if (imageUrl) image.src = imageUrl;
    const decoded = imageUrl && image.decode ? image.decode().catch(() => undefined) : Promise.resolve();
    fetch(`/terrain/details/${selected.id}/height.u16`).then(async (response) => {
      const grid = decodeHeight(
        await response.arrayBuffer(),
        detail.width,
        detail.height,
        detail.elevation.min,
        detail.elevation.max,
      );
      await decoded;
      if (cancel) return;
      setDetailGrid({
        width: detail.width,
        height: detail.height,
        bounds: detail.bounds,
        metres: grid,
      });
      const show = () => {
        if (cancel) return;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced || document.body.dataset.flying !== "true") {
          setReveal(true);
          setPanelShown(true);
          setBusy(false);
          return;
        }
        window.requestAnimationFrame(show);
      };
      show();
    }).catch(() => {
      if (!cancel) {
        setDetailGrid(null);
        setBusy(false);
      }
    });
    return () => {
      cancel = true;
    };
  }, [metadata, selected, detail, detailLayer]);

  useEffect(() => {
    document.body.dataset.site = selectedId ?? "";
    document.body.dataset.settings = settingsOpen ? "open" : "closed";
    document.body.dataset.panel = panelShown ? "open" : "closed";
    document.body.dataset.busy = busy ? "true" : "false";
    document.body.dataset.base = baseMap;
    for (const [layer, enabled] of Object.entries(layers)) {
      document.body.dataset[layer] = enabled ? "on" : "off";
    }
  }, [selectedId, settingsOpen, panelShown, busy, baseMap, layers]);

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
    const windowSize = metadata!.details[site.id]?.pixelSizeM ?? metadata!.pixelSizeM;
    const scale = naturalExaggeration(windowSize);
    setExaggeration(scale);
    const next = sitePose(site, metadata!, metres!, scale, pose!.token + 1);
    setPose(next);
    setSelectedId(site.id);
    setPanelShown(false);
    setReveal(false);
    setSettingsOpen(false);
    setHelp(false);
    setQuery("");
    const rasters = metadata!.details[site.id]?.rasters ?? {};
    setDetailLayer(preferredLayer(rasters, baseMap));
    setCompare(false);
  }

  function backToTurkey() {
    setSelectedId(null);
    setPanelShown(false);
    setReveal(false);
    setExaggeration(naturalExaggeration(metadata!.pixelSizeM));
    setPose(overviewPose(metadata!, sites, pose!.token + 1));
    setSettingsOpen(false);
    setHelp(false);
  }

  keys.current = {
    onPeriod: setPeriodId,
    onLayer: (layer) => setLayers((current) => ({ ...current, [layer]: !current[layer] })),
    onBase: setBaseMap,
    onSearch: () => searchRef.current?.focus(),
    onEscape: () => {
      if (help) {
        setHelp(false);
        return;
      }
      setSettingsOpen(false);
      setSelectedId(null);
      setPanelShown(false);
      setReveal(false);
    },
    onReset: backToTurkey,
    onTheme: toggleTheme,
    onHelp: () => setHelp((open) => !open),
  };

  const rasterEntries = Object.entries(detail?.rasters ?? {});
  const detailUrl = detail?.rasters[detailLayer] ? `/terrain/${detail.rasters[detailLayer]}` : null;
  const compareUrl = detail?.rasters[compareLayer] ? `/terrain/${detail.rasters[compareLayer]}` : null;

  return (
    <div className="atlas">
      <div className={busy ? "progress is-on" : "progress"} data-busy={busy ? "true" : "false"} />
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
        night={theme === "dark"}
        reveal={reveal}
        readoutRef={readoutRef}
        onSelect={(siteId) => {
          const site = sites.find((item) => item.id === siteId);
          if (site) {
            flyTo(site);
          }
        }}
      />
      <header className="topbar">
        <button type="button" className="brand" data-action="overview" aria-label="Reset view" onClick={backToTurkey}>Turkey</button>
        <form className="search" onSubmit={(event) => event.preventDefault()}>
          <input
            ref={searchRef}
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
        <button type="button" className="icon-button" aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} data-action="theme" onClick={toggleTheme}>
          <ThemeIcon night={theme === "dark"} />
        </button>
        <button type="button" className="icon-button" aria-label="Keyboard shortcuts" data-action="help" onClick={() => setHelp((open) => !open)}>?</button>
        <button type="button" className="icon-button" aria-label="Settings" data-action="settings" onClick={() => setSettingsOpen((open) => !open)}>
          <SlidersIcon />
        </button>
      </header>
      <PeriodDock periodId={periodId} onPeriod={setPeriodId} />
      <div className="readout" ref={readoutRef} data-on="false">
        <div className="north" data-role="north" aria-hidden="true" />
        <div className="scale"><i data-role="scale-bar" /><span data-role="scale-label">10 km</span></div>
      </div>
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
          shown={panelShown}
          onClose={() => {
            setSelectedId(null);
            setPanelShown(false);
            setReveal(false);
          }}
          onLayer={setDetailLayer}
          onCompare={setCompare}
          onCompareLayer={setCompareLayer}
          onSplit={setSplit}
          onOpacity={setOpacity}
        />
      ) : null}
      <Legend open={legendOpen} onToggle={() => setLegendOpen((open) => {
        const next = !open;
        storeLegend(next);
        return next;
      })} />
      {help ? <ShortcutOverlay onClose={() => setHelp(false)} /> : null}
      <p className="credit">{metadata.attribution.dem} {metadata.attribution.satellite}</p>
    </div>
  );
}

function SettingsMenu(props: {
  baseMap: BaseMap;
  layers: Record<LayerId, boolean>;
  exaggeration: number;
  azimuth: number;
  altitude: number;
  labels: boolean;
  onBase: (base: BaseMap) => void;
  onLayer: (layer: LayerId, enabled: boolean) => void;
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
      {(Object.keys(LAYER_STYLE) as LayerId[]).map((layer) => (
        <label className="check" key={layer}>
          <input type="checkbox" checked={props.layers[layer]} data-layer-toggle={layer} onChange={(event) => props.onLayer(layer, event.target.checked)} />
          <span className="swatch" style={{ background: LAYER_STYLE[layer].color }} /> {LAYER_STYLE[layer].title}
        </label>
      ))}
      <label>Exaggeration {props.exaggeration.toFixed(1)}× <input type="range" min={1} max={8} step={0.1} value={props.exaggeration} data-role="exaggeration" onChange={(event) => props.onExaggeration(Number(event.target.value))} /></label>
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
  shown: boolean;
  onClose: () => void;
  onLayer: (layer: string) => void;
  onCompare: (enabled: boolean) => void;
  onCompareLayer: (layer: string) => void;
  onSplit: (value: number) => void;
  onOpacity: (value: number) => void;
}) {
  const properties = props.site.properties;
  return (
    <aside className={props.shown ? "panel is-in" : "panel"} aria-label="Selected place">
      <button type="button" className="close" data-action="close-panel" onClick={props.onClose}>Close</button>
      <h2>{properties.name}</h2>
      <p className="muted">{properties.names.join(" · ")}</p>
      <p className="badge">{properties.confidence === "approximate" ? "Approximate location" : "Published location"} · {properties.category}</p>
      <p>{properties.period}. {formatYear(properties.startYear)} – {formatYear(properties.endYear)}.</p>
      <p>{properties.description}</p>
      <p>{properties.notes}</p>
      <p className="source-line"><a href={properties.sourceUrl} target="_blank" rel="noreferrer">{properties.source}</a></p>
      {props.rasters.length > 0 ? (
        <section className="place-layers">
          <h2>This place</h2>
          <div className="layer-pills">
          {props.rasters.map(([id]) => (
            <label className="check" key={id}>
              <input type="radio" name="detail" checked={props.detailLayer === id} data-detail-layer={id} onChange={() => props.onLayer(id)} />
              {RASTER_TITLES[id] ?? id}
            </label>
          ))}
          </div>
          <label>Opacity <input type="range" min={0.2} max={1} step={0.05} value={props.opacity} data-role="opacity" onChange={(event) => props.onOpacity(Number(event.target.value))} /></label>
          <label className="check">
            <input type="checkbox" checked={props.compare} data-role="compare" onChange={(event) => props.onCompare(event.target.checked)} />
            Compare
          </label>
          <select value={props.compareLayer} data-role="compare-layer" onChange={(event) => props.onCompareLayer(event.target.value)}>
            {props.rasters.map(([id]) => <option key={id} value={id}>{RASTER_TITLES[id] ?? id}</option>)}
          </select>
          <label>Swipe <input type="range" min={0} max={100} value={props.split * 100} data-role="swipe" onChange={(event) => props.onSplit(Number(event.target.value) / 100)} /></label>
        </section>
      ) : null}
    </aside>
  );
}

function ThemeIcon(props: { night: boolean }) {
  return props.night ? (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M9.2 2.2a5.2 5.2 0 1 0 4.6 7.6A6 6 0 0 1 9.2 2.2Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="2.4" />
      <path d="M8 1.6v1.6M8 12.8v1.6M1.6 8h1.6M12.8 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4 11.5 4.5M4.5 11.5l-1.1 1.1" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 4h12M2 8h12M2 12h12" />
      <circle cx="5" cy="4" r="1.3" />
      <circle cx="10" cy="8" r="1.3" />
      <circle cx="7" cy="12" r="1.3" />
    </svg>
  );
}

function overviewPose(metadata: AtlasMetadata, places: SiteFeature[], token: number): CameraPose {
  const origin = boundsCenter(metadata.bounds);
  const depth = metadata.bounds[3] - metadata.bounds[1];
  const focus = pinFocus(places, origin);
  return {
    position: [focus.x * 0.35, depth * 0.38, focus.z + depth * 0.5],
    target: [focus.x * 0.7, depth * 0.012, focus.z - depth * 0.02],
    token,
  };
}

function pinFocus(places: SiteFeature[], origin: [number, number]): { x: number; z: number } {
  const points = places.map((site) => {
    const [xCoord, zCoord] = toLocal(site.geometry.coordinates[0], site.geometry.coordinates[1], origin);
    return { x: xCoord, z: zCoord };
  });
  const cluster = points.filter((point) => point.x > 150000 && point.z > 180000 && point.z < 340000);
  const used = cluster.length >= 4 ? cluster : points;
  const xCoord = used.reduce((sum, point) => sum + point.x, 0) / used.length;
  const zCoord = used.reduce((sum, point) => sum + point.z, 0) / used.length;
  return { x: xCoord, z: zCoord };
}

function sitePose(site: SiteFeature, metadata: AtlasMetadata, metres: Float32Array, exaggeration: number, token: number): CameraPose {
  const origin = boundsCenter(metadata.bounds);
  const [longitude, latitude] = site.geometry.coordinates;
  const [east, north] = lonLatToMercator(longitude, latitude);
  const elevation = sampleHeight(metres, metadata.width, metadata.height, metadata.bounds, east, north);
  const [xCoord, zCoord] = toLocal(longitude, latitude, origin);
  const yCoord = (elevation - metadata.elevation.min) * exaggeration;
  const detail = metadata.details[site.id];
  const windowSpan = detail
    ? Math.max(detail.bounds[2] - detail.bounds[0], detail.bounds[3] - detail.bounds[1])
    : 80000;
  const distance = Math.max(windowSpan * 0.82, 5500);
  return {
    position: [xCoord + distance * 0.16, yCoord + distance * 0.34, zCoord + distance * 0.58],
    target: [xCoord, yCoord + 24, zCoord - distance * 0.05],
    token,
  };
}

function preferredLayer(rasters: Record<string, string>, baseMap: BaseMap): string {
  if (baseMap === "satellite" && rasters["true-colour"]) {
    return "true-colour";
  }
  if (baseMap === "satellite" && rasters.satellite) {
    return "satellite";
  }
  if (rasters.hillshade) {
    return "hillshade";
  }
  return Object.keys(rasters)[0] ?? "hillshade";
}
