import { useCallback, useMemo, useState } from "react";
import { resolvePlaceRelief, type TerrainSourceId } from "@/lib/terrainSource";
import type { AtlasMetadata, DetailRecord, SiteFeature } from "@/lib/types";
import type { WikiFeature } from "@/lib/wikidata";

export interface AtlasSelectionInput {
  metadata: AtlasMetadata | null;
  sites: SiteFeature[];
  wikiSites: WikiFeature[];
  /** Curated and catalogue pins currently drawn; only these can be the nearby place. */
  visible: SiteFeature[];
  wikiVisible: WikiFeature[];
  terrainSource: TerrainSourceId;
}

export interface AtlasSelection {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  setWikiId: (id: string | null) => void;
  setNearbyId: (id: string | null) => void;
  panelShown: boolean;
  setPanelShown: (shown: boolean) => void;
  showPanel: () => void;
  selected: SiteFeature | null;
  wikiSite: WikiFeature | null;
  nearby: SiteFeature | WikiFeature | undefined;
  detail: DetailRecord | undefined;
  nearbyDetail: DetailRecord | undefined;
  /** The place whose close-up terrain should be loaded. */
  activeId: string | undefined;
  activeRecord: DetailRecord | undefined;
  panelOpen: boolean;
}

/** Which place is selected, opened from the catalogue, or merely near the camera. */
export function useAtlasSelection(input: AtlasSelectionInput): AtlasSelection {
  const { metadata, sites, wikiSites, visible, wikiVisible, terrainSource } = input;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wikiId, setWikiId] = useState<string | null>(null);
  const [nearbyId, setNearbyId] = useState<string | null>(null);
  const [panelShown, setPanelShown] = useState(false);
  const showPanel = useCallback(() => setPanelShown(true), []);

  const selected = sites.find((site) => site.id === selectedId) ?? null;
  const wikiSite = wikiSites.find((site) => site.id === wikiId) ?? null;
  const nearby = !selected && !wikiSite
    ? visible.find((site) => site.id === nearbyId) ?? wikiVisible.find((site) => site.id === nearbyId)
    : undefined;
  const rawDetail = selected ? metadata?.details[selected.id] : undefined;
  const rawNearby = nearby ? metadata?.details[nearby.id] : undefined;
  // Memoised: the terrain loader restarts whenever these records change identity.
  const detail = useMemo(
    () => (rawDetail ? resolvePlaceRelief(rawDetail, terrainSource) : undefined),
    [rawDetail, terrainSource],
  );
  const nearbyDetail = useMemo(
    () => (rawNearby ? resolvePlaceRelief(rawNearby, terrainSource) : undefined),
    [rawNearby, terrainSource],
  );
  return {
    selectedId, setSelectedId, setWikiId, setNearbyId, panelShown, setPanelShown, showPanel,
    selected, wikiSite, nearby, detail, nearbyDetail,
    activeId: selected?.id ?? wikiSite?.id ?? (nearbyDetail ? nearby?.id : undefined),
    activeRecord: detail ?? nearbyDetail,
    panelOpen: Boolean(wikiSite || (selected && panelShown)),
  };
}
