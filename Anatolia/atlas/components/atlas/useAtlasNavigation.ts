import * as flights from "@/components/atlas/atlasFlights";
import type { AtlasData } from "@/components/atlas/useAtlasData";
import { useAtlasOverlays, type AtlasOverlays } from "@/components/atlas/useAtlasOverlays";
import { useAtlasSelection, type AtlasSelection } from "@/components/atlas/useAtlasSelection";
import type { CameraCommands } from "@/components/atlas/useCameraCommands";
import type { MapDisplay } from "@/components/atlas/useMapDisplay";
import { usePlaceLayers, type PlaceLayers } from "@/components/atlas/usePlaceLayers";
import type { RegionalTerrainState } from "@/components/atlas/useRegionalTerrain";
import type { TerrainSourceId } from "@/lib/terrainSource";
import type { RegionalTerrain, SiteFeature } from "@/lib/types";
import type { WikiFeature } from "@/lib/wikidata";

export interface AtlasNavigationInput {
  data: AtlasData;
  regional: RegionalTerrain | null;
  region: RegionalTerrainState;
  terrainSource: TerrainSourceId;
  display: MapDisplay;
  camera: CameraCommands;
  visible: SiteFeature[];
  wikiVisible: WikiFeature[];
}

export interface AtlasNavigation {
  overlays: AtlasOverlays;
  selection: AtlasSelection;
  placeLayers: PlaceLayers;
  flyTo: (site: SiteFeature) => void;
  openWiki: (site: WikiFeature) => void;
  /** Opens a place by id: a curated site first, then a catalogue place. */
  openPlace: (id: string) => void;
  visitCuratedPlace: (id: string) => void;
  openWikiById: (id: string) => void;
  backToTurkey: () => void;
  flyToRegion: () => void;
  toggleLandscape: () => void;
  toggleSettings: () => void;
  escape: () => void;
  showClimateFromMap: (recordId: string) => void;
  showClimateFromSettings: (recordId: string) => void;
  closeSite: () => void;
  closeWiki: () => void;
}

/** Selection, overlays and every move between places. */
export function useAtlasNavigation(input: AtlasNavigationInput): AtlasNavigation {
  const { data, camera } = input;
  const overlays = useAtlasOverlays();
  const selection = useAtlasSelection({ ...data, visible: input.visible, wikiVisible: input.wikiVisible, terrainSource: input.terrainSource });
  const placeLayers = usePlaceLayers(selection.detail);
  const context: flights.FlightContext = {
    metadata: data.metadata,
    metres: data.metres,
    regional: input.regional,
    region: input.region,
    terrainSource: input.terrainSource,
    display: input.display,
    camera,
    overlays,
    selection,
    placeLayers,
  };
  const flyTo = (site: SiteFeature) => flights.flyToSite(context, site);
  const openWiki = (site: WikiFeature) => flights.openWikiSite(context, site);
  const visitCuratedPlace = (id: string) => {
    const site = data.sites.find((item) => item.id === id);
    if (site) flyTo(site);
  };
  const openWikiById = (id: string) => {
    const site = data.wikiSites.find((item) => item.id === id);
    if (site) openWiki(site);
  };
  return {
    overlays, selection, placeLayers, flyTo, openWiki, visitCuratedPlace, openWikiById,
    openPlace: (id) => {
      if (data.sites.some((item) => item.id === id)) visitCuratedPlace(id);
      else openWikiById(id);
    },
    backToTurkey: () => flights.backToOverview(context),
    flyToRegion: () => flights.flyToRegion(context),
    toggleLandscape: () => flights.toggleLandscape(context),
    toggleSettings: () => {
      overlays.setLandscapeOpen(false);
      overlays.setSettingsOpen((open) => !open);
    },
    escape: () => flights.escapeAtlas(context),
    showClimateFromMap: (recordId) => {
      overlays.setLandscapeOpen(false);
      overlays.setClimateId(recordId);
      overlays.setSettingsOpen(false);
    },
    showClimateFromSettings: (recordId) => {
      overlays.setClimateId(recordId);
      overlays.setSettingsOpen(false);
    },
    closeSite: () => {
      selection.setSelectedId(null);
      selection.setPanelShown(false);
      camera.stopFlight();
    },
    closeWiki: () => {
      selection.setWikiId(null);
      camera.stopFlight();
    },
  };
}
