"use client";

import { useEffect, useId, useState } from "react";
import { OSM_MEGALITH_STYLE } from "@/lib/world/siteTypeStyle";
import type { SiteFilterViewModel } from "../useSiteFilter";
import { ChevronIcon } from "./ExplorerIcons";
import ui from "./chrome.module.css";
import styles from "./ExplorerLegend.module.css";
import { SiteTypeFilter } from "./SiteTypeFilter";

const ROOMY_SCREEN = "(min-width: 1100px) and (min-height: 760px)";
const count = (value: number) => value.toLocaleString("en-GB");

/** The colour key and type filter, under a one-line readout of how much of the catalogue is on the globe. */
export function ExplorerLegend(props: {
  siteTypes: string[];
  totalSites: number;
  filters: SiteFilterViewModel;
  showOsmMegaliths: boolean;
}) {
  const { filters, totalSites } = props;
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  // Open by default only where it does not crowd the globe.
  useEffect(() => setOpen(window.matchMedia(ROOMY_SCREEN).matches), []);
  const shown = filters.counts?.shown ?? null;

  return (
    <section className={`${ui.glass} ${styles.legend}`} aria-label="Legend and site types" data-role="explorer-legend">
      <button type="button" className={styles.toggle} aria-expanded={open} aria-controls={bodyId} data-action="toggle-legend" onClick={() => setOpen(!open)}>
        <span className={styles.status} data-role="site-status">
          {shown === null ? "Loading sites…" : (
            <><b className={ui.numeric}>{count(shown)}</b><span className={ui.numeric}> of {count(totalSites)} sites shown</span></>
          )}
        </span>
        <span className={styles.caret}><span className={ui.eyebrow}>Legend</span><ChevronIcon direction={open ? "down" : "up"} /></span>
      </button>
      <div id={bodyId} className={styles.body} hidden={!open}>
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
