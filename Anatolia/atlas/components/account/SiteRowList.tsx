"use client";

import type { ReactNode } from "react";
import type { PickedSite } from "@/lib/globe/siteBlock";
import { siteTypeStyle } from "@/lib/world/siteTypeStyle";
import { formatSiteDates } from "@/lib/world/worldEras";
import ui from "../globe/chrome/chrome.module.css";
import { moveFocusInList } from "../globe/chrome/listKeys";
import styles from "./account.module.css";

/** A list of catalogue sites as buttons that open the site on the globe. The arrow keys move between rows. */
export function SiteRowList(props: {
  sites: readonly PickedSite[];
  /** Shown at the right of a row: a vote total. */
  aside?(site: PickedSite): ReactNode;
  ordered?: boolean;
  onVisit(site: PickedSite): void;
}) {
  const List = props.ordered ? "ol" : "ul";
  return (
    <List className={styles.list} onKeyDown={moveFocusInList}>
      {props.sites.map((site) => (
        <li key={site.id}>
          <button type="button" className={styles.row} data-list-item data-site={site.id} onClick={() => props.onVisit(site)}>
            <span className={`${ui.serif} ${styles.name}`}>{site.name}</span>
            {props.aside ? <span className={`${ui.numeric} ${styles.aside}`}>{props.aside(site)}</span> : null}
            <span className={styles.meta}>
              {[siteTypeStyle(site.siteType).title, formatSiteDates(site.startYear, site.endYear)].filter(Boolean).join(" · ")}
            </span>
          </button>
        </li>
      ))}
    </List>
  );
}
