"use client";

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import type { GlobeLook } from "@/lib/globe/ellipsoid";
import { ENTER_ATLAS_ALTITUDE, atlasLookFromGlobe, type AtlasLook } from "@/lib/globe/handoff";
import { namedPeriodsForRegions, periodRegionKeyAt } from "@/lib/world/namedPeriods";
import { ExplorerChrome } from "./chrome/ExplorerChrome";
import { GlobeSites, type PickedSite } from "./GlobeSites";
import { GlobeView } from "./GlobeView";
import { useGlobeExplorer } from "./useGlobeExplorer";

export interface GlobeExplorerProps {
  /** Where the camera opens. Omit for the default view with its slow idle turn. */
  initialLook?: GlobeLook;
  /** A site to open and fly to once the catalogue has loaded (a shared `?site=` link). */
  initialSiteId?: string;
  onLookChange?(look: GlobeLook): void;
  /** The site whose card is open changed; null when the card closed. */
  onSelectSite?(siteId: string | null): void;
  /** "View terrain" on a site card. */
  onOpenPlace(siteId: string): void;
  /** Zooming in over Turkey, or "Open in Anatolia atlas" on a site card (then `siteId` is set). */
  onEnterAtlas(look: AtlasLook, siteId?: string): void;
  /** DOM controls for the predictive layer, mounted in the Layers panel. */
  modelSlot?: ReactNode;
  /** Extra three.js layers (the predictive overlay), rendered inside the globe Canvas after the sites. */
  sceneLayers?: ReactNode;
}

/** The world globe with its sites and chrome. Composition only: the state lives in useGlobeExplorer. */
export function GlobeExplorer(props: GlobeExplorerProps) {
  const { onLookChange, onEnterAtlas } = props;
  const [look, setLook] = useState<GlobeLook | null>(props.initialLook ?? null);
  const latestLook = useRef(look);
  const explorer = useGlobeExplorer({ initialSiteId: props.initialSiteId, look: latestLook, onSelectSite: props.onSelectSite });

  const trackLook = useCallback((next: GlobeLook) => {
    latestLook.current = next;
    setLook(next);
    onLookChange?.(next);
  }, [onLookChange]);

  const enterAtlasAtSite = useCallback((site: PickedSite) => {
    onEnterAtlas(atlasLookFromGlobe({ longitude: site.lon, latitude: site.lat, altitude: ENTER_ATLAS_ALTITUDE }), site.id);
  }, [onEnterAtlas]);

  // The look changes about 8 times a second; the chips change only when the view crosses a region's edge.
  const periodRegions = look ? periodRegionKeyAt(look.longitude, look.latitude, look.altitude) : "";
  const namedPeriods = useMemo(() => namedPeriodsForRegions(periodRegions), [periodRegions]);

  const { catalogue, selection } = explorer;
  return (
    <GlobeView
      initialLook={props.initialLook}
      onLookChange={trackLook}
      onEnterAtlas={onEnterAtlas}
      flyTo={selection.flyTo}
      overlay={<ExplorerChrome explorer={explorer} namedPeriods={namedPeriods} modelSlot={props.modelSlot} onOpenPlace={props.onOpenPlace} onEnterAtlas={enterAtlasAtSite} />}
    >
      {catalogue ? (
        <GlobeSites
          catalogue={catalogue}
          filter={explorer.filters.filter}
          look={look}
          selectedId={selection.selected?.id ?? null}
          showOsmMegaliths={explorer.showOsmMegaliths}
          showLabels={explorer.showLabels}
          onCellsChange={explorer.setLoadedCells}
          onPick={selection.select}
          onClusterPick={selection.flyToLook}
        />
      ) : null}
      {props.sceneLayers}
    </GlobeView>
  );
}
