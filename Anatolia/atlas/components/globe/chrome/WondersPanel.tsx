"use client";

import { memo, useMemo, useState } from "react";
import type { FeaturedSite } from "@/lib/world/catalogueTypes";
import { TAS_TEPELER_TOUR, WONDERS_TOUR } from "@/lib/world/guidedTours";
import { WONDER_STATUS, categoryTitle, groupWonders, type WonderGrouping } from "@/lib/world/wonders";
import { formatSiteDates } from "@/lib/world/worldEras";
import { CompassIcon } from "./ExplorerIcons";
import ui from "./chrome.module.css";
import { moveFocusInList } from "./listKeys";
import { PanelShell } from "./PanelShell";
import styles from "./WondersPanel.module.css";

const GROUPINGS: { id: WonderGrouping; label: string }[] = [
  { id: "era", label: "By era" },
  { id: "country", label: "By country" },
];

/** The curated list of remarkable early monuments: browse, filter, jump to one at random, or take the tour. */
export function WondersPanel(props: {
  featured: FeaturedSite[];
  tourLength: number;
  onVisit(siteId: string): void;
  onRandom(): void;
  onStartTour(tourId: string): void;
  onClose(): void;
}) {
  const [grouping, setGrouping] = useState<WonderGrouping>("era");
  const [query, setQuery] = useState("");
  const groups = useMemo(() => groupWonders(props.featured, grouping, query), [props.featured, grouping, query]);

  const toolbar = (
    <div className={styles.toolbar}>
      <div className={styles.actions}>
        <button type="button" className={`${ui.button} ${ui.buttonPrimary}`} data-action="random-wonder" onClick={props.onRandom}>
          <CompassIcon />Take me somewhere
        </button>
        {props.tourLength ? (
          <button type="button" className={ui.button} data-action="start-tour" data-tour={WONDERS_TOUR.id} onClick={() => props.onStartTour(WONDERS_TOUR.id)}>
            Tour {props.tourLength} places
          </button>
        ) : null}
        <button type="button" className={ui.button} data-action="start-tas-tepeler-tour" data-tour={TAS_TEPELER_TOUR.id} onClick={() => props.onStartTour(TAS_TEPELER_TOUR.id)}>
          {TAS_TEPELER_TOUR.title}
        </button>
      </div>
      <div className={styles.filters}>
        <input
          className={ui.textField}
          type="search"
          aria-label="Filter the wonders by name, country or kind"
          placeholder="Filter the list"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className={styles.grouping} role="group" aria-label="Group the list">
          {GROUPINGS.map((option) => (
            <button key={option.id} type="button" className={ui.chip} aria-pressed={grouping === option.id} onClick={() => setGrouping(option.id)}>
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <PanelShell
      dataRole="wonders-panel"
      eyebrow={`${props.featured.length} hand-picked early monuments`}
      title="Wonders"
      closeLabel="Close the wonders list"
      onClose={props.onClose}
      toolbar={toolbar}
    >
      <WonderList groups={groups} onVisit={props.onVisit} />
    </PanelShell>
  );
}

/** Memoised: ~400 rows that only change with the filter, not with every keystroke elsewhere. */
const WonderList = memo(function WonderList(props: { groups: ReturnType<typeof groupWonders>; onVisit(siteId: string): void }) {
  if (!props.groups.length) {
    return <p className={styles.empty}>Nothing on the list matches. Clear the filter to see every wonder.</p>;
  }
  return (
    <div onKeyDown={moveFocusInList}>
      {props.groups.map((group) => (
        <section key={group.title} aria-label={group.title}>
          <h3 className={`${ui.eyebrow} ${styles.groupTitle}`}>
            {group.title}<span className={ui.numeric}>{group.sites.length}</span>
          </h3>
          <ul className={styles.list}>
            {group.sites.map((site) => (
              <li key={site.id}><WonderRow site={site} onVisit={props.onVisit} /></li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
});

function WonderRow(props: { site: FeaturedSite; onVisit(siteId: string): void }) {
  const { site } = props;
  const status = WONDER_STATUS[site.status];
  const dates = formatSiteDates(site.startYear, site.endYear);
  return (
    <button type="button" className={styles.wonder} data-list-item data-wonder={site.id} onClick={() => props.onVisit(site.id)}>
      <span className={`${ui.serif} ${styles.name}`}>{site.name}</span>
      {status ? <span className={ui.badge}>{status.badge}</span> : null}
      <span className={styles.meta}>
        {[site.country, categoryTitle(site.category), dates].filter(Boolean).join(" · ")}
      </span>
      <span className={styles.why}>{site.why}</span>
    </button>
  );
}
