"use client";

import { memo, useEffect, useMemo, type ReactNode } from "react";
import type { PickedSite } from "../GlobeSites";
import type { GlobeExplorerViewModel } from "../useGlobeExplorer";
import { AboutPanel } from "./AboutPanel";
import styles from "./ExplorerChrome.module.css";
import { ExplorerLegend } from "./ExplorerLegend";
import { ExplorerTopbar } from "./ExplorerTopbar";
import { GlobeTimeline } from "./GlobeTimeline";
import { LayersPanel } from "./LayersPanel";
import { SiteCard } from "./SiteCard";
import { TourBar } from "./TourBar";
import { WondersPanel } from "./WondersPanel";

export interface ExplorerChromeProps {
  explorer: GlobeExplorerViewModel;
  modelSlot?: ReactNode;
  onOpenPlace(siteId: string): void;
  onEnterAtlas(site: PickedSite): void;
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
  const { catalogue, filters, selection, tour, panel } = explorer;
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
    >
      <div className={styles.top}>
        <ExplorerTopbar catalogue={catalogue} openPanel={selected ? null : panel} onVisit={selection.visit} onTogglePanel={explorer.togglePanel} />
        {explorer.catalogueError ? (
          <p className={styles.error} role="alert">The site catalogue did not load: {explorer.catalogueError} Reload the page to try again.</p>
        ) : null}
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
          {panel === "layers" ? (
            <LayersPanel
              osmMegaliths={catalogue?.index.osmMegaliths}
              showOsmMegaliths={explorer.showOsmMegaliths}
              featuredOnly={filters.featuredOnly}
              onShowOsmMegaliths={explorer.setShowOsmMegaliths}
              onFeaturedOnly={filters.setFeaturedOnly}
              modelSlot={props.modelSlot}
              onClose={closePanel}
            />
          ) : null}
          {panel === "about" ? <AboutPanel index={catalogue?.index ?? null} onClose={closePanel} /> : null}
        </div>
      </div>

      <div className={styles.bottom}>
        <div className={styles.legend}>
          <ExplorerLegend
            siteTypes={catalogue?.index.siteTypes ?? []}
            totalSites={catalogue?.core.id.length ?? 0}
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
            onSpan={filters.setYearSpan}
            onShowUndated={filters.setShowUndated}
          />
        </div>
      </div>
    </div>
  );
});
