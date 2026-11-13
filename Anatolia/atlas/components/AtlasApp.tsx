"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AtlasScene } from "@/components/AtlasScene";
import type { CameraPose, ZoomCommand } from "@/components/AtlasCamera";
import { LandscapePanel } from "@/components/LandscapePanel";
import { MapNavigation, NearbyPlace, SCROLL_SPEEDS } from "@/components/MapNavigation";
import { OccupationBar } from "@/components/OccupationBar";
import { PlaceGuide, ReadingList } from "@/components/PlaceGuide";
import { PlaceResources } from "@/components/PlaceResources";
import { CreditLine, PlaceMaps, closeupCreditNote } from "@/components/PlaceMaps";
import { SafeLink } from "@/components/SafeLink";
import { WikidataPanel } from "@/components/WikidataPanel";
import { Legend, PeriodDock, ShortcutOverlay, readLegendOpen, storeLegend, useAtlasKeys, useTheme, type AtlasKeyHandlers } from "@/components/AtlasChrome";
import { TimelineControl } from "@/components/TimelineControl";
import { TripControl } from "@/components/trip/TripControl";
import { TripLayer } from "@/components/trip/TripLayer";
import { useTripSession } from "@/components/trip/useTripSession";
import { TURKEY_TRIP_2026 } from "@/lib/trip/turkeyTrip2026";
import { naturalExaggeration } from "@/lib/exaggeration";
import { ATLAS_FOV_DEGREES, lookPoseArgument } from "@/lib/pinCluster";
import type { ClimatePoint, ContextLineLayer, ContextRasterLayer } from "@/components/ContextLayers";
import type { ContextFeature } from "@/lib/contextGeometry";
import { boundsCenter, boundsContain, lonLatToMercator, sampleHeight, toLocal } from "@/lib/geo";
import { closeupQuery, placeHeightUrl, readStoredReliefSource, reliefLoadFailure, resolvePlaceRelief, storeReliefSource, type TerrainSourceId } from "@/lib/terrainSource";
import { LAYER_STYLE, PERIODS, formatYear } from "@/lib/periods";
import { decodeHeight } from "@/lib/terrain";
import { regionalMaps, relatedPlaces } from "@/lib/placeLearning";
import {
  RANGE_END,
  RANGE_START,
  activeChip,
  nextPlayRange,
  pinsInRange,
  rangeForChip,
  spansOverlap,
  type YearRange,
} from "@/lib/timeline";
import type { AtlasMetadata, BaseMap, CoronaRecord, DetailRecord, LayerId, RegionalTerrain, SiteCollection, SiteFeature, SiteProperties } from "@/lib/types";
import { PERIOD_SPAN, type WikiFeature } from "@/lib/wikidata";
import type { TerrainGrid } from "@/lib/terrain";

interface LoadedTerrain {
  id: string;
  source: TerrainSourceId;
  grid: TerrainGrid | null;
  credit?: { relief: string; satellite: string };
}

class ReliefFetchError extends Error {
  constructor(readonly status: number) {
    super("relief-unavailable");
  }
}

const SCROLL_SPEED_KEY = "anatolia.scrollSpeed";

const RASTER_TITLES: Record<string, string> = {
  terrain: "Terrain and satellite",
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

export function AtlasApp({ regional }: { regional: RegionalTerrain | null }) {
  const [metadata, setMetadata] = useState<AtlasMetadata | null>(null);
  const [sites, setSites] = useState<SiteFeature[]>([]);
  const [metres, setMetres] = useState<Float32Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<YearRange>({ start: RANGE_START, end: RANGE_END });
  const [showUndated, setShowUndated] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [layers, setLayers] = useState<Record<LayerId, boolean>>({
    neolithic: true,
    bronze: true,
    classical: true,
    crusader: true,
  });
  const [baseMap, setBaseMap] = useState<BaseMap>("hypsometric");
  const [regionalLayer, setRegionalLayer] = useState("");
  const [regionalRequested, requestRegional] = useState(false);
  const [regionalGrid, setRegionalGrid] = useState<TerrainGrid | null>(null);
  const [regionalVisible, setRegionalVisible] = useState(false);
  const [terrainSource, setTerrainSource] = useState<TerrainSourceId>("gem15");
  const [reliefError, setReliefError] = useState<string | null>(null);
  const [exaggeration, setExaggeration] = useState(6.5);
  const [azimuth, setAzimuth] = useState(315);
  const [altitude, setAltitude] = useState(40);
  const [labels, setLabels] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [landscapeOpen, setLandscapeOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pose, setPose] = useState<CameraPose | null>(null);
  const [loadedTerrain, setLoadedTerrain] = useState<LoadedTerrain | null>(null);
  const [nearbyId, setNearbyId] = useState<string | null>(null);
  const [zoomSpeed, setZoomSpeed] = useState(1);
  const [zoomCommand, setZoomCommand] = useState<ZoomCommand>({ steps: 0, token: 0 });
  const [detailLayer, setDetailLayer] = useState("hillshade");
  const [compare, setCompare] = useState(false);
  const [compareLayer, setCompareLayer] = useState("true-colour");
  const [split, setSplit] = useState(0.5);
  const [opacity, setOpacity] = useState(1);
  const [panelShown, setPanelShown] = useState(false);
  const [help, setHelp] = useState(false);
  const [legendOpen, setLegendOpen] = useState(true);
  useEffect(() => {
    const stored = readStoredReliefSource();
    if (stored !== "gem15") setTerrainSource(stored);
  }, []);
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
  const [wikiSites, setWikiSites] = useState<WikiFeature[]>([]);
  const [wikiOn, setWikiOn] = useState(true);
  const [wikiId, setWikiId] = useState<string | null>(null);
  const [flightCancel, setFlightCancel] = useState(0);
  const tripSession = useTripSession(TURKEY_TRIP_2026);
  const showPanel = useCallback(() => setPanelShown(true), []);
  const prepareRegion = useCallback(() => requestRegional(true), []);
  const readoutRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const keys = useRef<AtlasKeyHandlers>({
    onPeriod: () => undefined,
    onLayer: () => undefined,
    onBase: () => undefined,
    onSearch: () => undefined,
    onEscape: () => undefined,
    onReset: () => undefined,
    onZoom: () => undefined,
    onTheme: () => undefined,
    onHelp: () => undefined,
  });
  useAtlasKeys(keys);
  useEffect(() => {
    setLegendOpen(readLegendOpen());
    try {
      const saved = Number(window.localStorage.getItem(SCROLL_SPEED_KEY));
      if (SCROLL_SPEEDS.some(({ value }) => value === saved)) setZoomSpeed(saved);
    } catch {
      // The current session can still use the control when storage is unavailable.
    }
  }, []);
  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setInterval(() => {
      setRange((current) => {
        const next = nextPlayRange(current);
        if (!next) {
          window.setTimeout(() => setPlaying(false), 0);
          return current;
        }
        return next;
      });
    }, 700);
    return () => window.clearInterval(timer);
  }, [playing]);
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
    if (!regional || !regionalRequested) return;
    const controller = new AbortController();
    fetch(`/terrain/${regional.heightFile}`, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) return;
      const { width, height, bounds, elevation } = regional;
      const grid = decodeHeight(await response.arrayBuffer(), width, height, elevation.min, elevation.max);
      if (!controller.signal.aborted) setRegionalGrid({ width, height, bounds, metres: grid });
    }).catch(() => undefined);
    return () => controller.abort();
  }, [regional, regionalRequested]);

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
      setPose(overviewPose(atlas.bounds, 0));
      document.body.dataset.ready = "true";
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "The atlas failed to load");
    });
    return () => {
      cancel = true;
    };
  }, []);

  const periodId = activeChip(range, PERIODS);
  const visible = useMemo(
    () => sites.filter((site) => layers[site.properties.layer] && pinsInRange([site], range, false).length === 1),
    [sites, layers, range],
  );
  const wikiVisible = useMemo(
    () => (wikiOn ? pinsInRange(wikiSites, range, showUndated) : []),
    [wikiOn, wikiSites, range, showUndated],
  );
  const selected = sites.find((site) => site.id === selectedId) ?? null;
  const wikiSite = wikiSites.find((site) => site.id === wikiId) ?? null;
  const nearby = !selected && !wikiSite
    ? visible.find((site) => site.id === nearbyId) ?? wikiVisible.find((site) => site.id === nearbyId)
    : undefined;
  const rawDetail = selected ? metadata?.details[selected.id] : undefined;
  const rawNearby = nearby ? metadata?.details[nearby.id] : undefined;
  const detail = useMemo(
    () => (rawDetail ? resolvePlaceRelief(rawDetail, terrainSource) : undefined),
    [rawDetail, terrainSource],
  );
  const nearbyDetail = useMemo(
    () => (rawNearby ? resolvePlaceRelief(rawNearby, terrainSource) : undefined),
    [rawNearby, terrainSource],
  );
  const activeId = selected?.id ?? wikiSite?.id ?? (nearbyDetail ? nearby?.id : undefined);
  const activeRecord = detail ?? nearbyDetail;
  const activeTerrain = loadedTerrain
    && loadedTerrain.id === activeId
    && loadedTerrain.source === terrainSource
    ? loadedTerrain
    : null;
  const busy = Boolean(activeId && !activeTerrain);
  const panelOpen = Boolean(wikiSite || (selected && panelShown));

  useEffect(() => {
    if (detail && detailLayer !== "satellite" && !detail.rasters[detailLayer]) {
      setDetailLayer("hillshade");
    }
  }, [detail, detailLayer]);

  useEffect(() => {
    if (!activeId) {
      setReliefError(null);
      document.body.dataset.detail = "";
      return;
    }
    document.body.dataset.detail = "loading";
    setReliefError(null);
    const controller = new AbortController();
    loadTerrain(activeId, activeRecord, terrainSource, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setLoadedTerrain(result);
      setReliefError(null);
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return;
      const failure = reliefLoadFailure(reason instanceof ReliefFetchError ? reason.status : 0);
      setLoadedTerrain({ id: activeId, source: terrainSource, grid: null });
      setPanelShown(failure.panelOpen);
      setReliefError(failure.message);
      document.body.dataset.detail = failure.detailState;
    });
    return () => controller.abort();
  }, [activeId, activeRecord, terrainSource]);

  useEffect(() => {
    document.body.dataset.site = selectedId ?? "";
    document.body.dataset.settings = settingsOpen ? "open" : "closed";
    document.body.dataset.panel = panelOpen ? "open" : "closed";
    document.body.dataset.busy = busy ? "true" : "false";
    document.body.dataset.base = baseMap;
    document.body.dataset.reliefSource = terrainSource;
    document.body.dataset.yearStart = String(range.start);
    document.body.dataset.yearEnd = String(range.end);
    document.body.dataset.period = periodId || "custom";
    document.body.dataset.undated = showUndated ? "show" : "hide";
    for (const [layer, enabled] of Object.entries(layers)) {
      document.body.dataset[layer] = enabled ? "on" : "off";
    }
  }, [selectedId, settingsOpen, panelOpen, busy, baseMap, layers, range, periodId, showUndated, terrainSource]);

  if (error) {
    return <p className="status">{error}</p>;
  }
  if (!metadata || !metres || !pose) {
    return <p className="status">Loading the Turkey terrain…</p>;
  }

  const needle = searchKey(query);
  const regionMatch = regional && needle.length >= 2
    && searchKey(regional.name).includes(needle);
  const matches = needle.length < 2 ? [] : sites.filter((site) => (
    site.properties.names.some((name) => searchKey(name).includes(needle))
  )).slice(0, 6);
  const wikiMatches = needle.length < 2 ? [] : pinsInRange(
    wikiSites.filter((site) => searchKey(site.properties.name).includes(needle)),
    range,
    showUndated,
  ).slice(0, 4);

  function flyTo(site: SiteFeature) {
    setLandscapeOpen(false);
    setClimateId(null);
    setWikiId(null);
    const raw = metadata!.details[site.id];
    const resolved = raw ? resolvePlaceRelief(raw, terrainSource) : undefined;
    const windowSize = resolved?.pixelSizeM ?? 39;
    const scale = naturalExaggeration(windowSize);
    setExaggeration(scale);
    const next = sitePose(site, metadata!, metres!, scale, pose!.token + 1, terrainSource);
    setPose(next);
    setSelectedId(site.id);
    setPanelShown(false);
    setSettingsOpen(false);
    setHelp(false);
    setQuery("");
    setDetailLayer(preferredLayer(resolved?.rasters ?? {}, baseMap));
    setCompare(false);
    if (!raw) setBaseMap("relief");
  }

  function openWiki(site: WikiFeature) {
    setLandscapeOpen(false);
    setClimateId(null);
    setSettingsOpen(false);
    setHelp(false);
    setWikiId(site.id);
    setDetailLayer(baseMap === "satellite" ? "satellite" : "hillshade");
    setCompare(false);
    setSelectedId(null);
    setPanelShown(false);
    setQuery("");
    const scale = naturalExaggeration(39);
    setExaggeration(scale);
    setBaseMap("relief");
    const [longitude, latitude] = site.geometry.coordinates;
    setPose(lookPose(longitude, latitude, metadata!, metres!, scale, pose!.token + 1, 16000));
  }

  function visitCuratedPlace(id: string) {
    const site = sites.find((item) => item.id === id);
    if (site) flyTo(site);
  }

  function stopFlight() {
    document.body.dataset.flying = "false";
    setFlightCancel((token) => token + 1);
  }

  function backToTurkey() {
    setLandscapeOpen(false);
    setSelectedId(null);
    setWikiId(null);
    setClimateId(null);
    setPanelShown(false);
    setExaggeration(naturalExaggeration(metadata!.pixelSizeM));
    setPose(overviewPose(metadata!.bounds, pose!.token + 1));
    setSettingsOpen(false);
    setHelp(false);
  }

  function flyToRegion() {
    if (!regional || !metadata || !metres || !pose) return;
    prepareRegion();
    setLandscapeOpen(false);
    setSelectedId(null);
    setWikiId(null);
    setClimateId(null);
    setPanelShown(false);
    setQuery("");
    setSettingsOpen(false);
    setHelp(false);
    const center = boundsCenter(regional.bounds);
    const [originX, originY] = boundsCenter(metadata.bounds);
    const scale = naturalExaggeration(regional.pixelSizeM);
    const terrain = regionalGrid ?? { ...metadata, metres };
    const elevation = sampleHeight(terrain.metres, terrain.width, terrain.height, terrain.bounds, ...center);
    const y = (elevation - metadata.elevation.min) * scale;
    setExaggeration(scale);
    setPose(overviewPose(regional.bounds, pose.token + 1, [center[0] - originX, y, originY - center[1]]));
  }

  function toggleLandscape() {
    if (!landscapeOpen) {
      setSelectedId(null);
      setWikiId(null);
      setPanelShown(false);
      setClimateId(null);
      setSettingsOpen(false);
      setHelp(false);
      stopFlight();
    }
    setLandscapeOpen(!landscapeOpen);
  }

  function zoomMap(steps: number) {
    setZoomCommand((previous) => ({ steps, token: previous.token + 1 }));
  }

  function changeScrollSpeed(speed: number) {
    setZoomSpeed(speed);
    try {
      window.localStorage.setItem(SCROLL_SPEED_KEY, String(speed));
    } catch {
      // The session value remains available.
    }
  }

  keys.current = {
    onPeriod: (id) => {
      const chip = PERIODS.find((item) => item.id === id);
      if (!chip) return;
      setPlaying(false);
      setRange(rangeForChip(chip));
    },
    onLayer: (layer) => setLayers((current) => ({ ...current, [layer]: !current[layer] })),
    onBase: setBaseMap,
    onSearch: () => searchRef.current?.focus(),
    onEscape: () => {
      if (help) {
        setHelp(false);
        return;
      }
      setLandscapeOpen(false);
      setSettingsOpen(false);
      setSelectedId(null);
      setWikiId(null);
      setPanelShown(false);
      setClimateId(null);
      stopFlight();
    },
    onReset: backToTurkey,
    onZoom: zoomMap,
    onTheme: toggleTheme,
    onHelp: () => setHelp((open) => !open),
  };

  const rasterEntries = Object.entries(detail?.rasters ?? {});
  const roadsInPeriod = spansOverlap(-300, 700, range);
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
  const currentLayer = nearbyDetail ? preferredLayer(nearbyDetail.rasters, baseMap) : detailLayer;
  const rasterPath = activeRecord?.rasters[currentLayer];
  const detailUrl = rasterPath
    ? `/terrain/${rasterPath}`
    : activeId && !activeRecord
      ? `/api/closeup?${closeupQuery(activeId, currentLayer === "satellite" ? "satellite" : "hillshade", terrainSource)}`
      : null;
  const compareUrl = detail?.rasters[compareLayer] ? `/terrain/${detail.rasters[compareLayer]}` : null;
  const regionLayerId = regionalLayer || ({
    hypsometric: "terrain", relief: "hillshade", satellite: "true-colour",
  } as const)[baseMap];
  const regionRaster = regional?.rasters[regionLayerId] ?? regional?.rasters.hypsometric;
  const sentinelLayers = ["terrain", "true-colour", "false-colour", "ndvi"];
  const regionalSentinel = (regionalVisible && sentinelLayers.includes(regionLayerId))
    || (detail && regional && [currentLayer, compare ? compareLayer : ""].some((layer) => sentinelLayers.includes(layer)));
  const closeupCredit = activeTerrain?.credit ?? null;

  return (
    <div className="atlas" data-has-panel={panelOpen ? "true" : "false"} data-has-landscape={landscapeOpen}>
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
        detail={activeTerrain?.grid ?? null}
        detailUrl={detailUrl}
        region={regional}
        regionalGrid={regionalGrid}
        regionalUrl={regionRaster ? `/terrain/${regionRaster}` : null}
        onRegionApproach={prepareRegion}
        onRegionVisibility={setRegionalVisible}
        compareUrl={compare ? compareUrl : null}
        compare={compare}
        split={split}
        opacity={opacity}
        night={theme === "dark"}
        readoutRef={readoutRef}
        contextLines={contextLines}
        contextRasters={contextRasters}
        climatePoints={climatePoints}
        climateId={climateId}
        onClimate={(recordId) => {
          setLandscapeOpen(false);
          setClimateId(recordId);
          setSettingsOpen(false);
        }}
        zoomSpeed={zoomSpeed}
        zoomCommand={zoomCommand}
        onArrival={showPanel}
        onNearby={setNearbyId}
        nearbyEnabled={!selected && !wikiSite && !climateId && !landscapeOpen}
        flightCancel={flightCancel}
        overlay={tripSession.open ? (
          <TripLayer
            replay={tripSession.replay}
            roads={tripSession.roads}
            metadata={metadata}
            metres={metres}
            exaggeration={exaggeration}
            follow={tripSession.follow}
            onFollowInterrupt={tripSession.stopFollowing}
          />
        ) : null}
        wikiSites={wikiVisible}
        onOpenWiki={(siteId) => {
          const site = wikiSites.find((item) => item.id === siteId);
          if (site) openWiki(site);
        }}
        onApproachWiki={(longitude, latitude, cameraDistance) => {
          const distance = lookPoseArgument(cameraDistance);
          setPose(lookPose(longitude, latitude, metadata, metres, exaggeration, pose.token + 1, distance));
          setWikiId(null);
          setSelectedId(null);
          setPanelShown(false);
        }}
        onSelect={(siteId) => {
          const site = sites.find((item) => item.id === siteId);
          if (site) {
            flyTo(site);
          }
        }}
      />
      <header className="topbar">
        <nav className="map-places" aria-label="Map views">
          <button type="button" className="brand" data-action="overview" aria-label="Turkey overview" onClick={backToTurkey}>Turkey</button>
          {regional ? (
            <button type="button" className="brand region-button" data-action="regional-overview" onClick={flyToRegion}>{regional.name}</button>
          ) : null}
        </nav>
        <form className="search" onSubmit={(event) => {
          event.preventDefault();
          if (regionMatch) flyToRegion();
          else if (matches[0]) flyTo(matches[0]);
          else if (wikiMatches[0]) openWiki(wikiMatches[0]);
        }}>
          <input
            ref={searchRef}
            value={query}
            placeholder="Search places"
            aria-label="Search places"
            data-role="search"
            onChange={(event) => setQuery(event.target.value)}
          />
          {regionMatch || matches.length > 0 || wikiMatches.length > 0 ? (
            <ul>
              {regionMatch ? (
                <li><button type="button" data-result="sanliurfa-region" onClick={flyToRegion}>{regional.name} region</button></li>
              ) : null}
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
        <button type="button" className="icon-button landscape-toggle" data-action="trip" aria-label="Replay our April 2026 trip" aria-pressed={tripSession.open} onClick={tripSession.toggle}>
          <span>Trip</span>
        </button>
        <button type="button" className="icon-button landscape-toggle" data-action="landscape" aria-label="Landscape statistics" aria-pressed={landscapeOpen} onClick={toggleLandscape}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2.5 13.5h11M4 11V8m4 3V3m4 8V5" />
          </svg>
          <span>Landscape</span>
        </button>
        <button type="button" className="icon-button" aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} data-action="theme" onClick={toggleTheme}>
          <ThemeIcon night={theme === "dark"} />
        </button>
        <button type="button" className="icon-button" aria-label="Keyboard shortcuts" data-action="help" onClick={() => setHelp((open) => !open)}>?</button>
        <button type="button" className="icon-button" aria-label="Settings" data-action="settings" onClick={() => {
          setLandscapeOpen(false);
          setSettingsOpen((open) => !open);
        }}>
          <SlidersIcon />
        </button>
      </header>
      <PeriodDock periodId={periodId} onPeriod={(id) => {
        const chip = PERIODS.find((item) => item.id === id);
        if (!chip) return;
        setPlaying(false);
        setRange(rangeForChip(chip));
      }} />
      <TimelineControl
        range={range}
        playing={playing}
        showUndated={showUndated}
        onRange={(next) => {
          setPlaying(false);
          setRange(next);
        }}
        onTogglePlay={() => setPlaying((current) => !current)}
        onUndated={setShowUndated}
      />
      {tripSession.open ? (
        <TripControl
          replay={tripSession.replay}
          roads={tripSession.roads}
          follow={tripSession.follow}
          onFollow={tripSession.setFollow}
          onClose={tripSession.close}
        />
      ) : null}
      <MapNavigation speed={zoomSpeed} onSpeed={changeScrollSpeed} onZoom={zoomMap} />
      {nearby && !settingsOpen && !help && !climateId && !landscapeOpen ? (
        <NearbyPlace key={nearby.id} site={nearby} onOpen={() => {
          const site = sites.find((item) => item.id === nearby.id);
          const wiki = wikiSites.find((item) => item.id === nearby.id);
          if (site) flyTo(site);
          else if (wiki) openWiki(wiki);
        }} />
      ) : null}
      <div className="readout" ref={readoutRef} data-on="false">
        {regionalVisible && regional ? <span className="regional-readout">{regional.name} · {Math.round(regional.pixelSizeM)} m regional terrain</span> : null}
        <div className="north" data-role="north" aria-hidden="true" />
        <div className="scale"><i data-role="scale-bar" /><span data-role="scale-label">10 km</span></div>
      </div>
      {settingsOpen ? (
        <SettingsMenu
          baseMap={baseMap}
          regional={regional}
          regionalLayer={regionalLayer}
          onRegionalLayer={setRegionalLayer}
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
          terrainSource={terrainSource}
          onTerrain={(source) => {
            setTerrainSource(source);
            storeReliefSource(source);
          }}
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
          key={selected.id}
          site={selected}
          related={relatedPlaces(selected, sites)}
          onVisit={visitCuratedPlace}
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
            setReliefError(null);
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
          reliefNote={terrainSource === "gem15" ? metadata.attribution.gem15 : metadata.attribution.dem}
          reliefError={reliefError}
          range={range}
        />
      ) : null}
      {wikiSite ? (
        <WikidataPanel
          key={wikiSite.id}
          site={wikiSite}
          related={relatedPlaces(wikiSite, sites)}
          onVisit={visitCuratedPlace}
          detailLayer={detailLayer}
          onLayer={setDetailLayer}
          contextOn={contextOn}
          onContext={(id, enabled) => setContextOn((current) => ({ ...current, [id]: enabled }))}
          credit={closeupCredit}
          range={range}
          onClose={() => {
            setWikiId(null);
            stopFlight();
          }}
        />
      ) : null}
      {climateRecord ? (
        <ClimateChart record={climateRecord} onClose={() => setClimateId(null)} />
      ) : null}
      {landscapeOpen ? (
        <LandscapePanel
          sites={sites}
          catalogue={wikiSites}
          range={range}
          metadata={metadata}
          metres={metres}
          onClose={() => setLandscapeOpen(false)}
        />
      ) : null}
      <Legend open={legendOpen} onToggle={() => setLegendOpen((open) => {
        const next = !open;
        storeLegend(next);
        return next;
      })} />
      {help ? <ShortcutOverlay onClose={() => setHelp(false)} /> : null}
      <details className="credit">
        <summary>GEM-15 · Copernicus · EOX · Pleiades</summary>
        <p>
          {metadata.attribution.gem15 ? <><CreditLine text={metadata.attribution.gem15} /> </> : null}
          {metadata.attribution.dem} <CreditLine text={metadata.attribution.satellite} />
          {regionalSentinel && regional ? <> · {regional.sentinelCredit} · {regional.sentinelDay}.</> : null}
          {" "}
          <SafeLink href="https://pleiades.stoa.org/">Pleiades</SafeLink>
          {" gazetteer © the contributors, "}
          <SafeLink href="https://creativecommons.org/licenses/by/3.0/us/">CC BY 3.0 US</SafeLink>.
        </p>
      </details>
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
  regional: RegionalTerrain | null;
  regionalLayer: string;
  onRegionalLayer: (layer: string) => void;
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
  terrainSource: TerrainSourceId;
  onTerrain: (source: TerrainSourceId) => void;
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
      <h2>Place relief</h2>
      <label className="check">
        <input type="radio" name="terrain" checked={props.terrainSource === "gem15"} data-terrain="gem15" onChange={() => props.onTerrain("gem15")} />
        <span>GEM-15 surface, 15 m</span>
      </label>
      <label className="check">
        <input type="radio" name="terrain" checked={props.terrainSource === "copernicus"} data-terrain="copernicus" onChange={() => props.onTerrain("copernicus")} />
        <span>Copernicus GLO-30</span>
      </label>
      {props.regional ? (
        <label className="regional-layer">
          Şanlıurfa layer
          <select value={props.regionalLayer} onChange={(event) => props.onRegionalLayer(event.target.value)}>
            <option value="">Follow base map</option>
            {Object.keys(props.regional.rasters).map((id) => (
              <option value={id} key={id}>{RASTER_TITLES[id] ?? id}</option>
            ))}
          </select>
        </label>
      ) : null}
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
        {props.roadsInPeriod ? " Roman roads are on for this range." : " Roman roads stay hidden until the range overlaps about 300 BCE–700 CE."}
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
      <details className="guide-map-library">
        <summary>Historical maps and external viewers</summary>
        <ReadingList entries={regionalMaps} />
      </details>
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

function occupationSegments(properties: SiteProperties): { id: string; start: number; end: number }[] {
  if (properties.periods && properties.periods.length > 0) {
    return properties.periods.flatMap((period) => {
      const span = PERIOD_SPAN[period];
      if (!span) return [];
      const [periodStart, periodEnd] = span;
      const start = Math.max(properties.startYear, periodStart);
      const end = Math.min(properties.endYear, periodEnd);
      if (end < start) return [];
      return [{ id: period, start, end }];
    });
  }
  return [{ id: properties.layer, start: properties.startYear, end: properties.endYear }];
}

function SitePanel(props: {
  site: SiteFeature;
  related: { id: string; name: string }[];
  onVisit: (id: string) => void;
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
  reliefNote?: string;
  reliefError?: string | null;
  range: YearRange;
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
    <PlaceGuide
      id={props.site.id}
      name={properties.name}
      label="Selected place"
      shown={props.shown}
      closeAction="close-panel"
      onClose={props.onClose}
      related={props.related}
      onVisit={props.onVisit}
      meta={<>
        <p className="guide-meta">{properties.period} · {properties.confidence === "approximate" ? "Approximate location" : "Published location"}</p>
        {props.reliefError ? <p data-role="relief-error">{props.reliefError}</p> : null}
      </>}
      overview={<>
        {properties.names.length > 1 ? <p className="muted">{properties.names.join(" · ")}</p> : null}
        <p>{formatYear(properties.startYear)} – {formatYear(properties.endYear)}</p>
        <OccupationBar segments={occupationSegments(properties)} range={props.range} />
        <p>{properties.description}</p>
        {properties.notes ? <p>{properties.notes}</p> : null}
      </>}
      sources={<>
        <p className="source-line">
          Catalogue citation · <SafeLink href={properties.sourceUrl}>{properties.source}</SafeLink>
          {properties.pleiadesUrl ? <> · <SafeLink href={properties.pleiadesUrl}>Pleiades</SafeLink> CC BY 3.0 US</> : null}
        </p>
        <PlaceResources id={props.site.id} longitude={props.site.geometry.coordinates[0]} latitude={props.site.geometry.coordinates[1]} />
      </>}
      maps={<>
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
        note={props.closeup ? closeupCreditNote(props.credit) : props.reliefNote}
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
      </>}
    />
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

function overviewPose(
  bounds: AtlasMetadata["bounds"],
  token: number,
  target: CameraPose["target"] = [0, 0, 0],
): CameraPose {
  const [left, bottom, right, top] = bounds;
  const aspect = Math.max(0.36, window.innerWidth / Math.max(1, window.innerHeight));
  const halfFov = Math.tan(ATLAS_FOV_DEGREES * Math.PI / 360);
  const distance = Math.max((right - left) * 0.55 / aspect, (top - bottom) * 0.62) / halfFov;
  const pitch = Math.PI * 0.36;
  return {
    position: [target[0], target[1] + Math.sin(pitch) * distance, target[2] + Math.cos(pitch) * distance],
    target,
    token,
  };
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

function sitePose(
  site: SiteFeature,
  metadata: AtlasMetadata,
  metres: Float32Array,
  exaggeration: number,
  token: number,
  source: TerrainSourceId,
): CameraPose {
  const origin = boundsCenter(metadata.bounds);
  const [longitude, latitude] = site.geometry.coordinates;
  const [east, north] = lonLatToMercator(longitude, latitude);
  const elevation = sampleHeight(metres, metadata.width, metadata.height, metadata.bounds, east, north);
  const [xCoord, zCoord] = toLocal(longitude, latitude, origin);
  const yCoord = (elevation - metadata.elevation.min) * exaggeration;
  const raw = metadata.details[site.id];
  const detail = raw ? resolvePlaceRelief(raw, source) : undefined;
  const windowSpan = detail
    ? Math.max(detail.bounds[2] - detail.bounds[0], detail.bounds[3] - detail.bounds[1])
    : 0;
  const distance = detail ? Math.max(windowSpan * 0.82, 5500) : 15500;
  return {
    position: [xCoord + distance * 0.16, yCoord + distance * 0.34, zCoord + distance * 0.58],
    target: [xCoord, yCoord + 24, zCoord - distance * 0.05],
    token,
  };
}

async function loadTerrain(
  id: string,
  detail: DetailRecord | undefined,
  source: TerrainSourceId,
  signal: AbortSignal,
): Promise<LoadedTerrain> {
  let meta = detail as (DetailRecord & { attribution?: { relief?: string; satellite?: string } }) | undefined;
  if (!meta) {
    const response = await fetch(`/api/closeup?${closeupQuery(id, "meta", source)}`, { signal });
    if (!response.ok) throw new ReliefFetchError(response.status);
    meta = await response.json() as NonNullable<typeof meta>;
  }
  const path = detail
    ? placeHeightUrl(detail, id)
    : `/api/closeup?${closeupQuery(id, "height", source)}`;
  const response = await fetch(path, { signal });
  if (!response.ok) throw new ReliefFetchError(response.status);
  const { width, height, bounds, elevation, attribution } = meta;
  const metres = decodeHeight(await response.arrayBuffer(), width, height, elevation.min, elevation.max);
  return {
    id,
    source,
    grid: { width, height, bounds, metres },
    credit: attribution ? { relief: attribution.relief ?? "", satellite: attribution.satellite ?? "" } : undefined,
  };
}

function preferredLayer(rasters: Record<string, string>, baseMap: BaseMap): string {
  if (baseMap !== "relief" && rasters["true-colour"]) {
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

function searchKey(value: string): string {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i");
}
