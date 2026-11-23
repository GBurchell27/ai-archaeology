"use client";

import { useMemo, useRef } from "react";
import { AtlasScene } from "@/components/AtlasScene";
import { Legend, PeriodDock, ShortcutOverlay, useAtlasKeys, type AtlasKeyHandlers } from "@/components/AtlasChrome";
import { AtlasCredits } from "@/components/AtlasCredits";
import { AtlasSearch } from "@/components/AtlasSearch";
import { AtlasTopbar } from "@/components/AtlasTopbar";
import { ClimateChart } from "@/components/ClimateChart";
import { LandscapePanel } from "@/components/LandscapePanel";
import { MapNavigation, NearbyPlace } from "@/components/MapNavigation";
import { SettingsMenu } from "@/components/SettingsMenu";
import { SitePanel } from "@/components/SitePanel";
import { TimelineControl } from "@/components/TimelineControl";
import { WikidataPanel } from "@/components/WikidataPanel";
import { useAtlasData } from "@/components/atlas/useAtlasData";
import { useAtlasNavigation } from "@/components/atlas/useAtlasNavigation";
import { useAtlasPreferences } from "@/components/atlas/useAtlasPreferences";
import { useBodyDataset } from "@/components/atlas/useBodyDataset";
import { useCameraCommands } from "@/components/atlas/useCameraCommands";
import { useContextLayers } from "@/components/atlas/useContextLayers";
import { useGlobeExit, type GlobeLook } from "@/components/atlas/useGlobeExit";
import { useInitialSite } from "@/components/atlas/useInitialSite";
import { useMapDisplay } from "@/components/atlas/useMapDisplay";
import { usePlaceTerrain } from "@/components/atlas/usePlaceTerrain";
import { useRegionalTerrain } from "@/components/atlas/useRegionalTerrain";
import { useSiteAddress } from "@/components/atlas/useSiteAddress";
import { useSiteTheoryLens } from "@/components/atlas/useSiteTheoryLens";
import { useTimelineState } from "@/components/atlas/useTimelineState";
import { useWalkEntry } from "@/components/atlas/useWalkEntry";
import { WalkOffer } from "@/components/atlas/WalkOffer";
import { TripControl } from "@/components/trip/TripControl";
import { TripLayer } from "@/components/trip/TripLayer";
import { useTripSession } from "@/components/trip/useTripSession";
import { lookPose, overviewPose } from "@/lib/atlasPoses";
import { naturalExaggeration } from "@/lib/exaggeration";
import { lookPoseArgument } from "@/lib/pinCluster";
import { relatedPlaces } from "@/lib/placeLearning";
import { sceneRasters } from "@/lib/sceneRasters";
import { searchPlaces } from "@/lib/search";
import { pinsInRange } from "@/lib/timeline";
import { TURKEY_TRIP_2026 } from "@/lib/trip/turkeyTrip2026";
import type { RegionalTerrain } from "@/lib/types";

export interface AtlasAppProps {
  regional: RegionalTerrain | null;
  /** Where the camera starts, when the atlas is entered from the world globe. */
  initialLook?: GlobeLook & { cameraDistance: number };
  /** A curated or catalogue place to open once the atlas has loaded. */
  initialSiteId?: string;
  /** Present when the atlas sits under the world globe: called to hand the view back. */
  onExitToGlobe?: (look: GlobeLook) => void;
  /** The selected place changed; null when none is. Its id goes in the address. */
  onSelectSite?: (siteId: string | null) => void;
  /** Present when the atlas sits under the coordinator: called with a walkable site's id to open its walk. */
  onEnterWalk?: (siteId: string) => void;
}

export function AtlasApp({ regional, initialLook, initialSiteId, onExitToGlobe, onSelectSite, onEnterWalk }: AtlasAppProps) {
  const preferences = useAtlasPreferences();
  const display = useMapDisplay();
  const camera = useCameraCommands();
  const timeline = useTimelineState();
  const region = useRegionalTerrain(regional);
  const data = useAtlasData((atlas, grid) => {
    const scale = naturalExaggeration(atlas.pixelSizeM);
    display.setExaggeration(scale);
    camera.setPose(initialLook
      ? lookPose(initialLook.longitude, initialLook.latitude, atlas, grid, scale, 0, lookPoseArgument(initialLook.cameraDistance))
      : overviewPose(atlas.bounds, 0));
  });
  const { metadata, metres, sites, wikiSites } = data;
  const { range, visibleRange, showUndated, periodId } = timeline;
  const { terrainSource } = preferences;
  const { baseMap, layers, wikiOn, exaggeration } = display;
  const night = preferences.theme === "dark";
  const context = useContextLayers(visibleRange, night, metadata?.bounds ?? null);
  const tripSession = useTripSession(TURKEY_TRIP_2026);
  const visible = useMemo(
    () => sites.filter((site) => layers[site.properties.layer] && pinsInRange([site], visibleRange, false).length === 1),
    [sites, layers, visibleRange],
  );
  const wikiVisible = useMemo(
    () => (wikiOn ? pinsInRange(wikiSites, visibleRange, showUndated) : []),
    [wikiOn, wikiSites, visibleRange, showUndated],
  );
  const navigation = useAtlasNavigation({ data, regional, region, terrainSource, display, camera, visible, wikiVisible });
  const { overlays, selection, placeLayers } = navigation;
  const { selected, wikiSite, nearby, detail, panelOpen } = selection;
  const { settingsOpen, landscapeOpen, help, climateId } = overlays;
  const theoryLens = useSiteTheoryLens(selection.selectedId);
  const terrain = usePlaceTerrain(selection.activeId, selection.activeRecord, terrainSource, selection.setPanelShown);
  const { busy } = terrain;
  useBodyDataset({
    selectedId: selection.selectedId, settingsOpen, panelOpen, busy, baseMap, layers, range: visibleRange, periodId, showUndated, terrainSource,
  });
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
  const initialSettled = useInitialSite(initialSiteId, camera.ready, data, navigation.flyTo, navigation.openWiki);
  useSiteAddress(selection.selectedId ?? wikiSite?.id ?? null, initialSettled, onSelectSite);
  const exitToGlobe = useGlobeExit(onExitToGlobe, metadata?.bounds ?? null);
  const walkEntry = useWalkEntry({ onEnterWalk, zoomEntry: !tripSession.open, sites, metadata, metres, exaggeration, camera });

  if (data.error) {
    return <p className="status">{data.error}</p>;
  }
  if (!metadata || !metres || !camera.pose) {
    return <p className="status">Loading the Turkey terrain…</p>;
  }

  const toggleHelp = () => overlays.setHelp((open) => !open);
  keys.current = {
    onPeriod: timeline.selectPeriod,
    onLayer: display.toggleLayer,
    onBase: display.setBaseMap,
    onSearch: () => searchRef.current?.focus(),
    onEscape: navigation.escape,
    onReset: navigation.backToTurkey,
    onZoom: camera.zoomMap,
    onTheme: preferences.toggleTheme,
    onHelp: toggleHelp,
  };

  const searchResult = searchPlaces(overlays.query, sites, wikiSites, visibleRange, showUndated, regional?.name ?? null);
  const rasters = sceneRasters({
    activeId: selection.activeId,
    activeRecord: selection.activeRecord,
    detail,
    nearbyDetail: selection.nearbyDetail,
    detailLayer: placeLayers.detailLayer,
    compare: placeLayers.compare,
    compareLayer: placeLayers.compareLayer,
    baseMap,
    terrainSource,
    regional,
    regionalLayer: region.regionalLayer,
    regionalVisible: region.regionalVisible,
  });
  const closeupCredit = terrain.activeTerrain?.credit ?? null;
  const climateRecord = context.climateRecords.find((record) => record.id === climateId) ?? null;

  return (
    <div className="atlas" data-has-panel={panelOpen ? "true" : "false"} data-has-landscape={landscapeOpen} data-theory={theoryLens.theoryId ?? ""}>
      <div className={busy ? "progress is-on" : "progress"} data-busy={busy ? "true" : "false"} />
      <AtlasScene
        metadata={metadata}
        metres={metres}
        sites={visible}
        baseMap={baseMap}
        exaggeration={exaggeration}
        azimuth={display.azimuth}
        altitude={display.altitude}
        labels={display.labels}
        selectedId={selection.selectedId}
        theorySiteIds={theoryLens.siteIds}
        pose={camera.pose}
        detail={terrain.activeTerrain?.grid ?? null}
        detailUrl={rasters.detailUrl}
        region={regional}
        regionalGrid={region.regionalGrid}
        regionalUrl={rasters.regionalUrl}
        regionalGain={rasters.regionalGain}
        detailGrade={rasters.detailGrade}
        onRegionApproach={region.prepareRegion}
        onRegionVisibility={region.setRegionalVisible}
        compareUrl={placeLayers.compare ? rasters.compareUrl : null}
        compare={placeLayers.compare}
        split={placeLayers.split}
        opacity={placeLayers.opacity}
        night={night}
        readoutRef={readoutRef}
        contextLines={context.contextLines}
        contextRasters={context.contextRasters}
        climatePoints={context.climatePoints}
        climateId={climateId}
        onClimate={navigation.showClimateFromMap}
        zoomSpeed={preferences.zoomSpeed}
        zoomCommand={camera.zoomCommand}
        onArrival={selection.showPanel}
        onCameraReady={camera.markReady}
        onNearby={selection.setNearbyId}
        nearbyEnabled={!selected && !wikiSite && !climateId && !landscapeOpen}
        flightCancel={camera.flightCancel}
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
        selectedWikiId={wikiSite?.id ?? null}
        onOpenWiki={navigation.openWikiById}
        onSelect={navigation.visitCuratedPlace}
      />
      <AtlasTopbar
        regionName={regional?.name ?? null}
        search={(
          <AtlasSearch
            query={overlays.query}
            onQuery={overlays.setQuery}
            inputRef={searchRef}
            result={searchResult}
            regional={regional}
            onRegion={navigation.flyToRegion}
            onSite={navigation.flyTo}
            onWiki={navigation.openWiki}
          />
        )}
        tripOpen={tripSession.open}
        landscapeOpen={landscapeOpen}
        night={night}
        onOverview={navigation.backToTurkey}
        onRegion={navigation.flyToRegion}
        onTrip={tripSession.toggle}
        onLandscape={navigation.toggleLandscape}
        onTheme={preferences.toggleTheme}
        onHelp={toggleHelp}
        onSettings={navigation.toggleSettings}
        onGlobe={exitToGlobe}
      />
      <PeriodDock periodId={periodId} onPeriod={timeline.selectPeriod} />
      <TimelineControl
        range={range}
        showUndated={showUndated}
        onRange={timeline.changeRange}
        onPlayYear={timeline.setPlayYear}
        onUndated={timeline.setShowUndated}
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
      <MapNavigation speed={preferences.zoomSpeed} onSpeed={preferences.changeScrollSpeed} onZoom={camera.zoomMap} />
      {walkEntry.offeredSite ? (
        <WalkOffer siteName={walkEntry.offeredSite.properties.name} onWalk={walkEntry.walkAction(walkEntry.offeredSite.id) ?? (() => undefined)} />
      ) : null}
      {nearby && !settingsOpen && !help && !climateId && !landscapeOpen ? (
        <NearbyPlace key={nearby.id} site={nearby} onOpen={() => navigation.openPlace(nearby.id)} />
      ) : null}
      <div className="readout" ref={readoutRef} data-on="false">
        {region.regionalVisible && regional ? <span className="regional-readout">{regional.name} · {Math.round(regional.pixelSizeM)} m regional terrain</span> : null}
        <div className="north" data-role="north" aria-hidden="true" />
        <div className="scale"><i data-role="scale-bar" /><span data-role="scale-label">10 km</span></div>
      </div>
      {settingsOpen ? (
        <SettingsMenu
          display={display}
          preferences={preferences}
          timeline={timeline}
          context={context}
          regional={regional}
          region={region}
          onClimate={navigation.showClimateFromSettings}
        />
      ) : null}
      {selected ? (
        <SitePanel
          key={selected.id}
          site={selected}
          related={relatedPlaces(selected, sites)}
          onVisit={navigation.visitCuratedPlace}
          onWalk={walkEntry.walkAction(selected.id)}
          rasters={Object.entries(detail?.rasters ?? {})}
          detailLayer={placeLayers.detailLayer}
          compare={placeLayers.compare}
          compareLayer={placeLayers.compareLayer}
          split={placeLayers.split}
          opacity={placeLayers.opacity}
          shown={selection.panelShown}
          onClose={() => {
            navigation.closeSite();
            terrain.clearReliefError();
          }}
          onLayer={placeLayers.setDetailLayer}
          onCompare={placeLayers.setCompare}
          onCompareLayer={placeLayers.setCompareLayer}
          onSplit={placeLayers.setSplit}
          onOpacity={placeLayers.setOpacity}
          corona={detail?.corona}
          baseMap={baseMap}
          onBase={display.setBaseMap}
          contextOn={context.contextOn}
          onContext={context.setContext}
          closeup={!detail}
          credit={closeupCredit}
          reliefNote={terrainSource === "gem15" ? metadata.attribution.gem15 : metadata.attribution.dem}
          reliefError={terrain.reliefError}
          range={visibleRange}
          openTheoryId={theoryLens.theoryId}
          onToggleTheory={theoryLens.toggleTheory}
        />
      ) : null}
      {wikiSite ? (
        <WikidataPanel
          key={wikiSite.id}
          site={wikiSite}
          related={relatedPlaces(wikiSite, sites)}
          onVisit={navigation.visitCuratedPlace}
          detailLayer={placeLayers.detailLayer}
          onLayer={placeLayers.setDetailLayer}
          contextOn={context.contextOn}
          onContext={context.setContext}
          credit={closeupCredit}
          range={visibleRange}
          onClose={navigation.closeWiki}
        />
      ) : null}
      {climateRecord ? <ClimateChart record={climateRecord} onClose={() => overlays.setClimateId(null)} /> : null}
      {landscapeOpen ? (
        <LandscapePanel
          sites={sites}
          catalogue={wikiSites}
          range={visibleRange}
          metadata={metadata}
          metres={metres}
          onClose={() => overlays.setLandscapeOpen(false)}
        />
      ) : null}
      <Legend open={preferences.legendOpen} onToggle={preferences.toggleLegend} />
      {help ? <ShortcutOverlay onClose={() => overlays.setHelp(false)} /> : null}
      <AtlasCredits attribution={metadata.attribution} sentinelRegion={rasters.regionalSentinel ? regional : null} />
    </div>
  );
}
