"use client";

import { memo, useCallback, useMemo, type ReactNode } from "react";
import { useDismissLayer } from "@/components/chrome/useDismissLayer";
import { DISMISS_PRIORITY } from "@/lib/chrome/dismissStack";
import type { WorldSource } from "@/lib/world/catalogueTypes";
import type { NamedPeriod } from "@/lib/world/namedPeriods";
import { AccountPanel } from "../../account/AccountPanel";
import { MostVotedPanel } from "../../account/MostVotedPanel";
import { useAccount } from "../../account/useAccount";
import type { PickedSite } from "../GlobeSites";
import { PaleoChip } from "../paleo/PaleoChip";
import type { GlobeExplorerViewModel } from "../useGlobeExplorer";
import { AboutPanel } from "./AboutPanel";
import { NewsRingOverlay } from "./NewsRingOverlay";
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

/**
 * All the DOM laid over the globe: top bar, the side column (site card over the open panel),
 * legend and timeline. Memoised so camera movement, which re-renders GlobeExplorer, does not touch it.
 */
export const ExplorerChrome = memo(function ExplorerChrome(props: ExplorerChromeProps) {
  const { explorer } = props;
  const { catalogue, selection, tour, theoryLens, panel } = explorer;
  const selected = selection.selected;
  // The card sits on the panel, so only the one the visitor can see takes Escape.
  useDismissLayer(selected !== null, explorer.closeTop, DISMISS_PRIORITY.panel);
  useDismissLayer(panel !== null && selected === null, explorer.closeTop, DISMISS_PRIORITY.panel);
  const wonder = useMemo(
    () => (selected?.featured ? catalogue?.featured.find((site) => site.id === selected.id) ?? null : null),
    [catalogue, selected],
  );
  const closePanel = explorer.closeTop;
  const account = useAccount();
  const { togglePanel } = explorer;
  const openSignIn = useCallback(() => togglePanel("account"), [togglePanel]);

  return (
    <div
      className={styles.explorer}
      data-role="globe-explorer"
      data-side={selected || panel ? "open" : "closed"}
      data-osm={explorer.showOsmMegaliths ? "on" : "off"}
      data-theory={theoryLens.theoryId ?? ""}
      data-paleo={explorer.paleo.enabled ? explorer.paleo.step?.year ?? "loading" : "off"}
      data-news-pins={explorer.showNewsPins ? "on" : "off"}
    >
      <NewsRingOverlay pins={explorer.newsRings} shown={explorer.showNewsPins} omitId={selected?.id ?? null} />
      <PaleoChip paleo={explorer.paleo} />
      <div className={styles.top}>
        <ExplorerTopbar
          catalogue={catalogue}
          catalogueFailed={explorer.catalogueError !== null}
          openPanel={selected ? null : panel}
          accountLabel={account ? (account.session === "signedIn" ? "Account" : "Sign in") : null}
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
            account={account}
            onRequestSignIn={openSignIn}
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
          {account && panel === "most-voted" ? (
            <MostVotedPanel loadVoteCounts={account.loadVoteCounts} catalogue={catalogue} onVisit={selection.visit} onClose={closePanel} />
          ) : null}
          {account && panel === "account" ? (
            <AccountPanel account={account} catalogue={catalogue} onVisit={selection.visit} onClose={closePanel} />
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
          newsPins={explorer.newsPins}
          newsReady={catalogue !== null}
          showNewsPins={explorer.showNewsPins}
          onShowNewsPins={explorer.setShowNewsPins}
          onShowNewsSite={explorer.selection.visit}
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
          onPlayYear={filters.setPlayYear}
          onShowUndated={filters.setShowUndated}
        />
      </div>
    </div>
  );
}
