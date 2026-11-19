"use client";

import { memo, useEffect, useMemo, type ReactNode } from "react";
import type { WorldSource } from "@/lib/world/catalogueTypes";
import type { NamedPeriod } from "@/lib/world/namedPeriods";
import type { PickedSite } from "../GlobeSites";
import type { GlobeExplorerViewModel } from "../useGlobeExplorer";
import { AboutPanel } from "./AboutPanel";
import { CatalogueNotice } from "./CatalogueNotice";
import styles from "./ExplorerChrome.module.css";
import { ExplorerLegend } from "./ExplorerLegend";
import { ExplorerTopbar } from "./ExplorerTopbar";
import { GlobeTimeline } from "./GlobeTimeline";
import { GlobeSettingsPanel } from "./GlobeSettingsPanel";
import { SiteCard } from "./SiteCard";
import { TheoriesPanel } from "./TheoriesPanel";
import { TourBar } from "./TourBar";
import { WondersPanel } from "./WondersPanel";

export interface ExplorerChromeProps {
  explorer: GlobeExplorerViewModel;
  /** Period chips for the region in view. The array keeps its identity until the set changes, because the chrome is memoised. */
  namedPeriods: readonly NamedPeriod[];
  /** The imagery on the globe now: the visitor's pick, or the default or its fallback. */
  basemapId: string;
  modelSlot?: ReactNode;
  onOpenPlace(siteId: string): void;
  onEnterAtlas(site: PickedSite): void;
  onEnterWalk(siteId: string): void;
}

function useEscapeToClose(closeTop: () => boolean): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented && closeTop()) event.preventDefault();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeTop]);
}

/**
 * All the DOM laid over the globe: top bar, the side column (site card over the open panel),
 * legend and timeline. Memoised so camera movement, which re-renders GlobeExplorer, does not touch it.
 */
export const ExplorerChrome = memo(function ExplorerChrome(props: ExplorerChromeProps) {
  const { explorer } = props;
  const { catalogue, selection, tour, theoryLens, panel } = explorer;
  const selected = selection.selected;
  useEscapeToClose(explorer.closeTop);
  const wonder = useMemo(
    () => (selected?.featured ? catalogue?.featured.find((site) => site.id === selected.id) ?? null : null),
    [catalogue, selected],
  );
  const closePanel = explorer.closeTop;

  return (
    <div
      className={styles.explorer}
      data-role="globe-explorer"
      data-side={selected || panel ? "open" : "closed"}
      data-osm={explorer.showOsmMegaliths ? "on" : "off"}
      data-theory={theoryLens.theoryId ?? ""}
    >
      <div className={styles.top}>
        <ExplorerTopbar
          catalogue={catalogue}
          catalogueFailed={explorer.catalogueError !== null}
          openPanel={selected ? null : panel}
          onVisit={selection.visit}
          onTogglePanel={explorer.togglePanel}
        />
      </div>

      <div className={styles.side}>
        <TourBar tour={tour} />
        {selected ? (
          <SiteCard
            site={selected}
            wonder={wonder}
            onClose={explorer.closeTop}
            onFlyCloser={selection.flyCloser}
            onOpenPlace={props.onOpenPlace}
            onEnterAtlas={props.onEnterAtlas}
            onEnterWalk={props.onEnterWalk}
            onOpenTheory={explorer.openTheory}
          />
        ) : null}
        {/* The panel stays mounted under the card, so its scroll position and filter survive a visit. */}
        <div className={styles.slot} hidden={selected !== null}>
          {panel === "wonders" ? (
            <WondersPanel
              featured={catalogue?.featured ?? []}
              tourLength={tour.stops.length}
              onVisit={selection.visitById}
              onRandom={explorer.visitRandomWonder}
              onStartTour={tour.start}
              onClose={closePanel}
            />
          ) : null}
          {panel === "theories" ? (
            <TheoriesPanel
              theoryId={theoryLens.theoryId}
              ringedSites={theoryLens.siteIds.length}
              onOpenTheory={explorer.openTheory}
              onClearTheory={() => theoryLens.setTheoryId(null)}
              onShowOnGlobe={theoryLens.showOnGlobe}
              onClose={closePanel}
            />
          ) : null}
          {panel === "settings" ? (
            <GlobeSettingsPanel explorer={explorer} namedPeriods={props.namedPeriods} basemapId={props.basemapId} modelSlot={props.modelSlot} onClose={closePanel} />
          ) : null}
          {panel === "about" ? <AboutPanel index={catalogue?.index ?? null} onClose={closePanel} /> : null}
        </div>
      </div>

      {explorer.catalogueError ? (
        <div className={styles.bottom}><div className={styles.dock}><CatalogueNotice reason={explorer.catalogueError} /></div></div>
      ) : (
        <ExplorerBottom explorer={explorer} namedPeriods={props.namedPeriods} />
      )}
    </div>
  );
});

const NO_SOURCES: WorldSource[] = [];

/** Legend and timeline: the controls that only make sense once there are sites to filter. */
function ExplorerBottom({ explorer, namedPeriods }: { explorer: GlobeExplorerViewModel; namedPeriods: readonly NamedPeriod[] }) {
  const { catalogue, filters } = explorer;
  const osmFile = catalogue?.index.osmMegaliths;
  const sources = useMemo(
    () => catalogue?.index.sources.filter((source) => !(osmFile && source.id === "osm")) ?? NO_SOURCES,
    [catalogue, osmFile],
  );
  return (
    <div className={styles.bottom}>
      <div className={styles.legend}>
        <ExplorerLegend
          siteTypes={catalogue?.index.siteTypes ?? []}
          totalSites={catalogue?.index.count ?? 0}
          sources={sources}
          filters={filters}
          showOsmMegaliths={explorer.showOsmMegaliths}
        />
      </div>
      <div className={styles.dock}>
        <GlobeTimeline
          span={filters.yearSpan}
          showUndated={filters.showUndated}
          shownCount={filters.counts?.shown ?? null}
          undatedCount={filters.counts?.undated ?? null}
          namedPeriods={namedPeriods}
          onSpan={filters.setYearSpan}
          onShowUndated={filters.setShowUndated}
        />
      </div>
    </div>
  );
}
