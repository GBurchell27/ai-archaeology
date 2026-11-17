import type { AtlasOverlays } from "@/components/atlas/useAtlasOverlays";
import type { AtlasSelection } from "@/components/atlas/useAtlasSelection";
import type { CameraCommands } from "@/components/atlas/useCameraCommands";
import type { MapDisplay } from "@/components/atlas/useMapDisplay";
import type { PlaceLayers } from "@/components/atlas/usePlaceLayers";
import type { RegionalTerrainState } from "@/components/atlas/useRegionalTerrain";
import { lookPose, overviewPose, sitePose } from "@/lib/atlasPoses";
import { naturalExaggeration } from "@/lib/exaggeration";
import { boundsCenter, sampleHeight } from "@/lib/geo";
import { lookPoseArgument } from "@/lib/pinCluster";
import { preferredLayer } from "@/lib/rasterLayers";
import { resolvePlaceRelief, type TerrainSourceId } from "@/lib/terrainSource";
import type { AtlasMetadata, RegionalTerrain, SiteFeature } from "@/lib/types";
import type { WikiFeature } from "@/lib/wikidata";

/** Everything a camera move reads or resets. Each move resets its own, deliberately different, set. */
export interface FlightContext {
  metadata: AtlasMetadata | null;
  metres: Float32Array | null;
  regional: RegionalTerrain | null;
  region: RegionalTerrainState;
  terrainSource: TerrainSourceId;
  display: MapDisplay;
  camera: CameraCommands;
  overlays: AtlasOverlays;
  selection: AtlasSelection;
  placeLayers: PlaceLayers;
}

export function flyToSite(context: FlightContext, site: SiteFeature): void {
  const { metadata, metres, camera, overlays, selection, placeLayers, display, terrainSource } = context;
  if (!metadata || !metres || !camera.pose) return;
  overlays.setLandscapeOpen(false);
  overlays.setClimateId(null);
  selection.setWikiId(null);
  const raw = metadata.details[site.id];
  const resolved = raw ? resolvePlaceRelief(raw, terrainSource) : undefined;
  const scale = naturalExaggeration(resolved?.pixelSizeM ?? 39);
  display.setExaggeration(scale);
  camera.setPose(sitePose(site, metadata, metres, scale, camera.pose.token + 1, terrainSource));
  selection.setSelectedId(site.id);
  selection.setPanelShown(false);
  overlays.setSettingsOpen(false);
  overlays.setHelp(false);
  overlays.setQuery("");
  placeLayers.setDetailLayer(preferredLayer(resolved?.rasters ?? {}, display.baseMap));
  placeLayers.setCompare(false);
  if (!raw) display.setBaseMap("relief");
}

export function openWikiSite(context: FlightContext, site: WikiFeature): void {
  const { metadata, metres, camera, overlays, selection, placeLayers, display } = context;
  if (!metadata || !metres || !camera.pose) return;
  overlays.setLandscapeOpen(false);
  overlays.setClimateId(null);
  overlays.setSettingsOpen(false);
  overlays.setHelp(false);
  selection.setWikiId(site.id);
  placeLayers.setDetailLayer(display.baseMap === "satellite" ? "satellite" : "hillshade");
  placeLayers.setCompare(false);
  selection.setSelectedId(null);
  selection.setPanelShown(false);
  overlays.setQuery("");
  const scale = naturalExaggeration(39);
  display.setExaggeration(scale);
  display.setBaseMap("relief");
  const [longitude, latitude] = site.geometry.coordinates;
  camera.setPose(lookPose(longitude, latitude, metadata, metres, scale, camera.pose.token + 1, 16000));
}

export function backToOverview(context: FlightContext): void {
  const { metadata, camera, overlays, selection, display } = context;
  if (!metadata || !camera.pose) return;
  overlays.setLandscapeOpen(false);
  selection.setSelectedId(null);
  selection.setWikiId(null);
  overlays.setClimateId(null);
  selection.setPanelShown(false);
  display.setExaggeration(naturalExaggeration(metadata.pixelSizeM));
  camera.setPose(overviewPose(metadata.bounds, camera.pose.token + 1));
  overlays.setSettingsOpen(false);
  overlays.setHelp(false);
}

export function flyToRegion(context: FlightContext): void {
  const { regional, metadata, metres, camera, overlays, selection, display, region } = context;
  if (!regional || !metadata || !metres || !camera.pose) return;
  region.prepareRegion();
  overlays.setLandscapeOpen(false);
  selection.setSelectedId(null);
  selection.setWikiId(null);
  overlays.setClimateId(null);
  selection.setPanelShown(false);
  overlays.setQuery("");
  overlays.setSettingsOpen(false);
  overlays.setHelp(false);
  const center = boundsCenter(regional.bounds);
  const [originX, originY] = boundsCenter(metadata.bounds);
  const scale = naturalExaggeration(regional.pixelSizeM);
  const terrain = region.regionalGrid ?? { ...metadata, metres };
  const elevation = sampleHeight(terrain.metres, terrain.width, terrain.height, terrain.bounds, ...center);
  const y = (elevation - metadata.elevation.min) * scale;
  display.setExaggeration(scale);
  camera.setPose(overviewPose(regional.bounds, camera.pose.token + 1, [center[0] - originX, y, originY - center[1]]));
}

/** Flies toward a catalogue cluster without opening any place. */
export function approachWikiCluster(context: FlightContext, longitude: number, latitude: number, cameraDistance: number): void {
  const { metadata, metres, camera, selection, display } = context;
  if (!metadata || !metres || !camera.pose) return;
  const distance = lookPoseArgument(cameraDistance);
  camera.setPose(lookPose(longitude, latitude, metadata, metres, display.exaggeration, camera.pose.token + 1, distance));
  selection.setWikiId(null);
  selection.setSelectedId(null);
  selection.setPanelShown(false);
}

export function toggleLandscape(context: FlightContext): void {
  const { overlays, selection, camera } = context;
  if (!overlays.landscapeOpen) {
    selection.setSelectedId(null);
    selection.setWikiId(null);
    selection.setPanelShown(false);
    overlays.setClimateId(null);
    overlays.setSettingsOpen(false);
    overlays.setHelp(false);
    camera.stopFlight();
  }
  overlays.setLandscapeOpen(!overlays.landscapeOpen);
}

/** Escape closes the shortcut sheet first; a second press clears everything else. */
export function escapeAtlas(context: FlightContext): void {
  const { overlays, selection, camera } = context;
  if (overlays.help) {
    overlays.setHelp(false);
    return;
  }
  overlays.setLandscapeOpen(false);
  overlays.setSettingsOpen(false);
  selection.setSelectedId(null);
  selection.setWikiId(null);
  selection.setPanelShown(false);
  overlays.setClimateId(null);
  camera.stopFlight();
}
