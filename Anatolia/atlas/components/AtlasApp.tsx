"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AtlasScene, type CameraPose } from "@/components/AtlasScene";
import { OccupationBar } from "@/components/OccupationBar";
import { CreditLine, PlaceMaps, closeupCreditNote } from "@/components/PlaceMaps";
import { SafeLink } from "@/components/SafeLink";
import { WikidataPanel } from "@/components/WikidataPanel";
import { Legend, PeriodDock, ShortcutOverlay, readLegendOpen, storeLegend, useAtlasKeys, useTheme, type AtlasKeyHandlers } from "@/components/AtlasChrome";
import { naturalExaggeration } from "@/lib/exaggeration";
import type { ClimatePoint, ContextLineLayer, ContextRasterLayer } from "@/components/ContextLayers";
import type { ContextFeature } from "@/lib/contextGeometry";
import { boundsCenter, boundsContain, lonLatToMercator, sampleHeight, toLocal } from "@/lib/geo";
import { LAYER_STYLE, PERIODS, formatYear, periodOverlaps } from "@/lib/periods";
import { decodeHeight } from "@/lib/terrain";
import type { AtlasMetadata, BaseMap, CoronaRecord, DetailRecord, LayerId, SiteCollection, SiteFeature } from "@/lib/types";
import { wikiInPeriod, type WikiFeature } from "@/lib/wikidata";
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
  corona: "CORONA, 1968–69",
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
  const [contextOn, setContextOn] = useState<Record<string, boolean>>({
    rivers: false,
    lakes: false,
    "paleo-water": false,
    roads: false,
    clay: false,
    soc: false,
    climate: false,
  });
  const [contextOpacity, setContextOpacity] = useState(0.62);
  const [vectorCache, setVectorCache] = useState<Record<string, ContextFeature[]>>({});
  const [climateRecords, setClimateRecords] = useState<ClimateRecord[]>([]);
  const [climateId, setClimateId] = useState<string | null>(null);
  const [detailToken, setDetailToken] = useState(0);
  const [wikiSites, setWikiSites] = useState<WikiFeature[]>([]);
  const [wikiOn, setWikiOn] = useState(true);
  const [wikiId, setWikiId] = useState<string | null>(null);
  const [flightCancel, setFlightCancel] = useState(0);
  const [closeupCredit, setCloseupCredit] = useState<{ relief: string; satellite: string } | null>(null);
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
    fetch("/wikidata/sites.geojson")
      .then((response) => response.json())
      .then((collection: { features: WikiFeature[] }) => setWikiSites(collection.features))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const files: Record<string, string> = {
      rivers: "rivers.geojson",
      lakes: "lakes.geojson",
      "paleo-water": "paleo.geojson",
      roads: "roads.geojson",
    };
    let cancel = false;
    for (const [id, file] of Object.entries(files)) {
      if (!contextOn[id] || vectorCache[id]) continue;
      fetch(`/context/${file}`).then((response) => response.json()).then((data: { features: ContextFeature[] }) => {
        if (!cancel) setVectorCache((current) => ({ ...current, [id]: data.features }));
      }).catch(() => undefined);
    }
    if (contextOn.climate && climateRecords.length === 0) {
      fetch("/context/climate.json").then((response) => response.json()).then((data: { records: ClimateRecord[] }) => {
        if (!cancel) setClimateRecords(data.records);
      }).catch(() => undefined);
    }
    return () => {
      cancel = true;
    };
  }, [contextOn, vectorCache, climateRecords.length]);

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
    const wiki = wikiSites.find((site) => site.id === wikiId) ?? null;
    if (!selected && !wiki) {
      setDetailGrid(null);
      setCloseupCredit(null);
      return;
    }
    document.body.dataset.detail = "loading";
    setDetailToken((current) => {
      const next = current + 1;
      document.body.dataset.detailToken = String(next);
      return next;
    });
    if (!detail) {
      const siteId = selected?.id ?? wiki?.id;
      if (!siteId) {
        setDetailGrid(null);
        return;
      }
      const query = `id=${encodeURIComponent(siteId)}`;
      let cancel = false;
      setBusy(true);
      setReveal(false);
      setPanelShown(false);
      setCloseupCredit(null);
      const layer = detailLayer === "satellite" ? "satellite" : "hillshade";
      const image = new Image();
      image.src = `/api/closeup?${query}&part=${layer}`;
      const decoded = image.decode ? image.decode().catch(() => undefined) : Promise.resolve();
      fetch(`/api/closeup?${query}&part=meta`).then(async (response) => {
        if (!response.ok) throw new Error("close-up-failed");
        const meta = await response.json() as DetailRecord & { attribution?: { relief?: string; satellite?: string } };
        const height = await fetch(`/api/closeup?${query}&part=height`);
        if (!height.ok) throw new Error("close-up-failed");
        const grid = decodeHeight(await height.arrayBuffer(), meta.width, meta.height, meta.elevation.min, meta.elevation.max);
        await decoded;
        if (cancel) return;
        setCloseupCredit({
          relief: meta.attribution?.relief ?? "",
          satellite: meta.attribution?.satellite ?? "",
        });
        setDetailGrid({ width: meta.width, height: meta.height, bounds: meta.bounds, metres: grid });
        const show = () => {
          if (cancel) return;
          if (document.body.dataset.flying !== "true") {
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
          setPanelShown(true);
        }
      });
      return () => {
        cancel = true;
      };
    }
    if (!selected) return;
    setCloseupCredit(null);
    const siteId = selected.id;
    let cancel = false;
    setBusy(true);
    setReveal(false);
    setPanelShown(false);
    const imageUrl = detail.rasters[detailLayer] ? `/terrain/${detail.rasters[detailLayer]}` : "";
    const image = new Image();
    if (imageUrl) image.src = imageUrl;
    const decoded = imageUrl && image.decode ? image.decode().catch(() => undefined) : Promise.resolve();
    fetch(`/terrain/details/${siteId}/height.u16`).then(async (response) => {
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
  }, [metadata, selected, detail, detailLayer, wikiId, wikiSites]);

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

  const needle = query.trim().toLowerCase();
  const matches = needle.length < 2 ? [] : sites.filter((site) => (
    site.properties.names.some((name) => name.toLowerCase().includes(needle))
  )).slice(0, 6);
  const wikiMatches = needle.length < 2 ? [] : wikiSites.filter((site) => (
    site.properties.name.toLowerCase().includes(needle)
  )).slice(0, 4);

  function flyTo(site: SiteFeature) {
    const token = detailToken + 1;
    document.body.dataset.detail = "loading";
    document.body.dataset.detailToken = String(token);
    setDetailToken(token);
    setWikiId(null);
    const windowSize = metadata!.details[site.id]?.pixelSizeM ?? 39;
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
    if (!metadata!.details[site.id]) setBaseMap("relief");
  }

  function openWiki(site: WikiFeature) {
    setWikiId(site.id);
    setSelectedId(null);
    setPanelShown(false);
    setReveal(false);
    setQuery("");
    const token = detailToken + 1;
    document.body.dataset.detail = "loading";
    document.body.dataset.detailToken = String(token);
    setDetailToken(token);
    const scale = naturalExaggeration(39);
    setExaggeration(scale);
    setBaseMap("relief");
    const [longitude, latitude] = site.geometry.coordinates;
    setPose(lookPose(longitude, latitude, metadata!, metres!, scale, pose!.token + 1, 16000));
  }

  function stopFlight() {
    document.body.dataset.detail = "";
    document.body.dataset.flying = "false";
    setFlightCancel((token) => token + 1);
  }

  function backToTurkey() {
    document.body.dataset.detail = "";
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
      setWikiId(null);
      setPanelShown(false);
      setReveal(false);
      setClimateId(null);
      stopFlight();
    },
    onReset: backToTurkey,
    onTheme: toggleTheme,
    onHelp: () => setHelp((open) => !open),
  };

  const rasterEntries = Object.entries(detail?.rasters ?? {});
  const wikiVisible = wikiOn ? wikiSites.filter((site) => wikiInPeriod(site, period.id)) : [];
  const wikiSite = wikiSites.find((site) => site.id === wikiId) ?? null;
  const roadsInPeriod = period.id === "all" || (period.start <= 700 && period.end >= -300);
  const lineColor: Record<string, string> = theme === "dark"
    ? { rivers: "#8ec8d8", lakes: "#8ec8d8", "paleo-water": "#e2b07a", roads: "#f0d7a4" }
    : { rivers: "#1d6278", lakes: "#1d6278", "paleo-water": "#8a5a22", roads: "#6a4318" };
  const contextLines: ContextLineLayer[] = ["rivers", "lakes", "paleo-water", "roads"]
    .filter((id) => contextOn[id] && vectorCache[id] && (id !== "roads" || roadsInPeriod))
    .map((id) => ({ id, color: lineColor[id], features: vectorCache[id] }));
  const contextRasters: ContextRasterLayer[] = ["clay", "soc"]
    .filter((id) => contextOn[id])
    .map((id) => ({ id, url: `/context/${id}.png`, opacity: contextOpacity }));
  const climatePoints: ClimatePoint[] = contextOn.climate
    ? climateRecords.filter((record) => {
      const [east, north] = lonLatToMercator(record.longitude, record.latitude);
      return boundsContain(metadata.bounds, east, north);
    }).map((record) => ({
      id: record.id,
      name: record.name,
      longitude: record.longitude,
      latitude: record.latitude,
    }))
    : [];
  const climateRecord = climateRecords.find((record) => record.id === climateId) ?? null;
  const liveId = !detail && (selected || wikiSite) ? (selected ?? wikiSite)!.id : null;
  const detailUrl = detail?.rasters[detailLayer]
    ? `/terrain/${detail.rasters[detailLayer]}`
    : liveId
      ? `/api/closeup?id=${encodeURIComponent(liveId)}&part=${detailLayer === "satellite" ? "satellite" : "hillshade"}`
      : null;
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
        contextLines={contextLines}
        contextRasters={contextRasters}
        climatePoints={climatePoints}
        climateId={climateId}
        onClimate={(recordId) => {
          setClimateId(recordId);
          setSettingsOpen(false);
        }}
        detailToken={detailToken}
        flightCancel={flightCancel}
        wikiSites={wikiVisible}
        onOpenWiki={(siteId) => {
          const site = wikiSites.find((item) => item.id === siteId);
          if (site) openWiki(site);
        }}
        onApproachWiki={(longitude, latitude) => {
          setPose(lookPose(longitude, latitude, metadata, metres, exaggeration, pose.token + 1));
          setWikiId(null);
        }}
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
          {matches.length > 0 || wikiMatches.length > 0 ? (
            <ul>
              {matches.map((site) => (
                <li key={site.id}>
                  <button type="button" data-result={site.id} onClick={() => flyTo(site)}>{site.properties.name}</button>
                </li>
              ))}
              {wikiMatches.map((site) => (
                <li key={site.id}>
                  <button type="button" data-result={site.id} onClick={() => openWiki(site)}>{site.properties.name}</button>
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
          wikiOn={wikiOn}
          onWiki={setWikiOn}
          contextOn={contextOn}
          contextOpacity={contextOpacity}
          roadsInPeriod={roadsInPeriod}
          climateRecords={climateRecords}
          onContext={(id, enabled) => setContextOn((current) => ({ ...current, [id]: enabled }))}
          onContextOpacity={setContextOpacity}
          onClimate={(recordId) => {
            setClimateId(recordId);
            setSettingsOpen(false);
          }}
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
            stopFlight();
          }}
          onLayer={setDetailLayer}
          onCompare={setCompare}
          onCompareLayer={setCompareLayer}
          onSplit={setSplit}
          onOpacity={setOpacity}
          corona={detail?.corona}
          baseMap={baseMap}
          onBase={setBaseMap}
          contextOn={contextOn}
          onContext={(id, enabled) => setContextOn((current) => ({ ...current, [id]: enabled }))}
          closeup={!detail}
          credit={closeupCredit}
        />
      ) : null}
      {wikiSite ? (
        <WikidataPanel
          site={wikiSite}
          detailLayer={detailLayer}
          onLayer={setDetailLayer}
          contextOn={contextOn}
          onContext={(id, enabled) => setContextOn((current) => ({ ...current, [id]: enabled }))}
          credit={closeupCredit}
          onClose={() => {
            setWikiId(null);
            stopFlight();
          }}
        />
      ) : null}
      {climateRecord ? (
        <ClimateChart record={climateRecord} onClose={() => setClimateId(null)} />
      ) : null}
      <Legend open={legendOpen} onToggle={() => setLegendOpen((open) => {
        const next = !open;
        storeLegend(next);
        return next;
      })} />
      {help ? <ShortcutOverlay onClose={() => setHelp(false)} /> : null}
      <p className="credit">{metadata.attribution.dem} <CreditLine text={metadata.attribution.satellite} /></p>
    </div>
  );
}

const CONTEXT_TOGGLES: { id: string; title: string }[] = [
  { id: "rivers", title: "Present-day rivers" },
  { id: "lakes", title: "Present-day lakes" },
  { id: "paleo-water", title: "Approximate paleolakes" },
  { id: "roads", title: "Roman roads" },
  { id: "clay", title: "Soil clay" },
  { id: "soc", title: "Soil organic carbon" },
  { id: "climate", title: "Palaeoclimate records" },
];

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
  wikiOn: boolean;
  onWiki: (enabled: boolean) => void;
  contextOn: Record<string, boolean>;
  contextOpacity: number;
  roadsInPeriod: boolean;
  climateRecords: ClimateRecord[];
  onContext: (id: string, enabled: boolean) => void;
  onContextOpacity: (value: number) => void;
  onClimate: (recordId: string) => void;
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
      <label className="check">
        <input type="checkbox" checked={props.wikiOn} data-layer-toggle="wikidata" onChange={(event) => props.onWiki(event.target.checked)} />
        Wikidata places
      </label>
      <h2>Context</h2>
      {CONTEXT_TOGGLES.map((layer) => (
        <label className="check" key={layer.id}>
          <input
            type="checkbox"
            checked={props.contextOn[layer.id]}
            data-context={layer.id}
            onChange={(event) => props.onContext(layer.id, event.target.checked)}
          />
          {layer.title}
        </label>
      ))}
      <p className="hint">
        Rivers and lakes are present-day. Paleolakes are approximate sketches.
        {props.roadsInPeriod ? " Roman roads are on for this period." : " Roman roads stay hidden until All periods or Classical & Byzantine."}
      </p>
      <label>Soil opacity <input type="range" min={0.25} max={0.9} step={0.05} value={props.contextOpacity} data-role="context-opacity" onChange={(event) => props.onContextOpacity(Number(event.target.value))} /></label>
      {props.contextOn.climate ? (
        <div className="climate-list">
          {props.climateRecords.map((record) => (
            <button type="button" key={record.id} data-climate={record.id} onClick={() => props.onClimate(record.id)}>
              {record.name}
            </button>
          ))}
        </div>
      ) : null}
    </aside>
  );
}

interface ClimateRecord {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  units: string;
  citation: string;
  sourceUrl: string;
  series: [number, number][];
}

function ClimateChart(props: { record: ClimateRecord; onClose: () => void }) {
  const series = props.record.series;
  const years = series.map((pair) => pair[0]);
  const values = series.map((pair) => pair[1]);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const width = 360;
  const height = 148;
  const pad = 16;
  const xOf = (year: number) => pad + ((year - minYear) / Math.max(maxYear - minYear, 1)) * (width - pad * 2);
  const yOf = (value: number) => pad + (1 - (value - minValue) / Math.max(maxValue - minValue, 0.001)) * (height - pad * 2);
  const path = series.map((pair, index) => `${index === 0 ? "M" : "L"}${xOf(pair[0]).toFixed(1)},${yOf(pair[1]).toFixed(1)}`).join(" ");
  const marks = [
    { year: -6200, label: "8.2 ka" },
    { year: -2200, label: "4.2 ka" },
  ].filter((mark) => mark.year >= minYear && mark.year <= maxYear);
  return (
    <aside className="panel is-in chart" aria-label="Palaeoclimate record" data-chart={props.record.id}>
      <button type="button" className="close" data-action="close-chart" onClick={props.onClose}>Close</button>
      <h2>{props.record.name}</h2>
      <p className="muted">{props.record.units}</p>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${props.record.name} time series`}>
        {marks.map((mark) => (
          <g key={mark.label}>
            <line x1={xOf(mark.year)} x2={xOf(mark.year)} y1={pad} y2={height - pad} />
            <text x={xOf(mark.year) + 4} y={pad + 10}>{mark.label}</text>
          </g>
        ))}
        <path d={path} />
      </svg>
      <p>This record shows the published measurements. The lines mark about 6200 BCE (8.2 ka) and 2200 BCE (4.2 ka). The effect of the 8.2 ka event on early farming is debated.</p>
      <p className="source-line"><SafeLink href={props.record.sourceUrl}>{props.record.citation}</SafeLink></p>
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
  corona?: CoronaRecord;
  baseMap: BaseMap;
  onBase: (base: BaseMap) => void;
  contextOn: Record<string, boolean>;
  onContext: (id: string, enabled: boolean) => void;
  closeup?: boolean;
  credit?: { relief: string; satellite: string } | null;
}) {
  const properties = props.site.properties;
  const ids = new Set(props.rasters.map(([id]) => id));
  const reliefId = ids.has("hillshade") ? "hillshade" : ids.has("hypsometric") ? "hypsometric" : null;
  const sentinelId = ids.has("true-colour") ? "true-colour" : ids.has("satellite") ? "satellite" : null;
  const coronaId = ids.has("corona") ? "corona" : null;
  const local = reliefId != null || sentinelId != null || coronaId != null;
  const reliefChoice = reliefId ?? (props.closeup ? "hillshade" : null);
  const sentinelChoice = sentinelId ?? (props.closeup ? "satellite" : null);
  return (
    <aside className={props.shown ? "panel is-in" : "panel"} aria-label="Selected place">
      <button type="button" className="close" data-action="close-panel" onClick={props.onClose}>Close</button>
      <h2>{properties.name}</h2>
      <p className="muted">{properties.names.join(" · ")}</p>
      <p className="badge">{properties.confidence === "approximate" ? "Approximate location" : "Published location"} · {properties.category}</p>
      <p>{properties.period}. {formatYear(properties.startYear)} – {formatYear(properties.endYear)}.</p>
      <OccupationBar segments={[{ id: properties.layer, start: properties.startYear, end: properties.endYear }]} />
      <p>{properties.description}</p>
      <p>{properties.notes}</p>
      <p className="source-line"><SafeLink href={properties.sourceUrl}>{properties.source}</SafeLink></p>
      <PlaceMaps
        reliefOn={reliefChoice ? props.detailLayer === reliefChoice : props.baseMap === "relief"}
        sentinelOn={sentinelChoice ? props.detailLayer === sentinelChoice : props.baseMap === "satellite"}
        coronaOn={coronaId != null && props.detailLayer === coronaId}
        coronaAvailable={coronaId != null}
        onRelief={() => (reliefChoice ? props.onLayer(reliefChoice) : props.onBase("relief"))}
        onSentinel={() => (sentinelChoice ? props.onLayer(sentinelChoice) : props.onBase("satellite"))}
        onCorona={() => {
          if (coronaId) props.onLayer(coronaId);
        }}
        contextOn={props.contextOn}
        onContext={props.onContext}
        note={props.closeup ? closeupCreditNote(props.credit) : undefined}
      />
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
          {props.corona && (props.detailLayer === "corona" || (props.compare && props.compareLayer === "corona")) ? (
            <p className="source-line" data-role="corona-credit">
              {props.corona.credit}. Frame {props.corona.frame} ({props.corona.date}), about {props.corona.pixelSizeM.toFixed(1)} m.
              {" "}{props.corona.licence}. {props.corona.note}{" "}
              <SafeLink href={props.corona.sourceUrl}>CORONA Atlas</SafeLink>
            </p>
          ) : null}
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

function lookPose(
  longitude: number,
  latitude: number,
  metadata: AtlasMetadata,
  metres: Float32Array,
  exaggeration: number,
  token: number,
  distance = 70000,
): CameraPose {
  const origin = boundsCenter(metadata.bounds);
  const [east, north] = lonLatToMercator(longitude, latitude);
  const elevation = sampleHeight(metres, metadata.width, metadata.height, metadata.bounds, east, north);
  const [xCoord, zCoord] = toLocal(longitude, latitude, origin);
  const yCoord = (elevation - metadata.elevation.min) * exaggeration;
  return {
    position: [xCoord + distance * 0.16, yCoord + distance * 0.34, zCoord + distance * 0.58],
    target: [xCoord, yCoord + 24, zCoord - distance * 0.05],
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
