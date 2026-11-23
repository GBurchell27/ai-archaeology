"use client";

import { useEffect, useId, useState } from "react";
import type { PickedSite } from "@/lib/globe/siteBlock";
import type { WorldSource } from "@/lib/world/catalogueTypes";
import { OSM_MEGALITH_STYLE } from "@/lib/world/siteTypeStyle";
import type { NewsPin } from "../useNewsPins";
import type { SiteFilterViewModel } from "../useSiteFilter";
import { ChevronIcon } from "./ExplorerIcons";
import ui from "./chrome.module.css";
import styles from "./ExplorerLegend.module.css";
import { NewsPinList } from "./NewsPinList";
import { SiteTypeFilter } from "./SiteTypeFilter";

const ROOMY_SCREEN = "(min-width: 1100px) and (min-height: 760px)";
const count = (value: number) => value.toLocaleString("en-GB");

/** The colour key and type filter, under a one-line readout of how much of the catalogue is on the globe. */
export function ExplorerLegend(props: {
  siteTypes: string[];
  /** Every site in the catalogue, loaded or not. */
  totalSites: number;
  /** The catalogues the dots come from. The OpenStreetMap layer carries its own credit while it is on. */
  sources: WorldSource[];
  filters: SiteFilterViewModel;
  showOsmMegaliths: boolean;
  newsPins: readonly NewsPin[];
  newsReady: boolean;
  showNewsPins: boolean;
  onShowNewsPins(shown: boolean): void;
  onShowNewsSite(site: PickedSite): void;
}) {
  const { filters, totalSites } = props;
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  // Open by default only where it does not crowd the globe.
  useEffect(() => setOpen(window.matchMedia(ROOMY_SCREEN).matches), []);
  const counts = filters.counts;

  return (
    <section className={`${ui.glass} ${styles.legend}`} aria-label="Legend and site types" data-role="explorer-legend">
      {props.sources.length ? (
        <p className={styles.credit} data-role="site-records-credit">
          Site records: {props.sources.map((source) => `${source.attribution}, ${source.licence}`).join(" · ")}
        </p>
      ) : null}
      <button type="button" className={styles.toggle} aria-expanded={open} aria-controls={bodyId} data-action="toggle-legend" onClick={() => setOpen(!open)}>
        <span className={styles.status} data-role="site-status">
          {counts === null ? "Loading sites…" : (
            <>
              <span className={ui.numeric}>
                <b>{count(counts.shown)}</b>
                <span className={styles.shownFull}> sites shown</span>
                <span className={styles.shownShort}> sites</span>
              </span>
              <span className={`${ui.numeric} ${styles.loaded}`} title="Regional sites load as you zoom in">
                {count(counts.loaded)} loaded of {count(totalSites)}
              </span>
            </>
          )}
        </span>
        <span className={styles.caret}><span className={`${ui.eyebrow} ${styles.caretLabel}`}>Legend</span><ChevronIcon direction={open ? "down" : "up"} /></span>
      </button>
      <div id={bodyId} className={styles.body} hidden={!open}>
        <NewsPinList
          pins={props.newsPins}
          ready={props.newsReady}
          shown={props.showNewsPins}
          onShown={props.onShowNewsPins}
          onShowSite={props.onShowNewsSite}
        />
        <SiteTypeFilter
          siteTypes={props.siteTypes}
          counts={filters.counts?.byType ?? null}
          hiddenTypes={filters.hiddenTypes}
          onToggle={filters.toggleType}
          onSolo={filters.soloType}
          onShowAll={filters.showAllTypes}
        />
        <ul className={styles.marks}>
          <li><i className={styles.wonderMark} />Named in serif: one of the wonders</li>
          <li><i className={styles.clusterMark}>12</i>A number: that many sites close together</li>
          {props.showOsmMegaliths ? (
            <li><i className={ui.swatch} style={{ ["--swatch" as string]: OSM_MEGALITH_STYLE.color }} />{OSM_MEGALITH_STYLE.title}</li>
          ) : null}
        </ul>
      </div>
    </section>
  );
}
