"use client";

import { SITE_TYPE_STYLE, siteTypeStyle } from "@/lib/world/siteTypeStyle";
import ui from "./chrome.module.css";
import { moveFocusInList } from "./listKeys";
import styles from "./SiteTypeFilter.module.css";

/** Catalogue types in the palette's family order, so rows that share a colour sit together. */
function orderedTypes(siteTypes: string[]): string[] {
  const known = Object.keys(SITE_TYPE_STYLE).filter((siteType) => siteTypes.includes(siteType));
  return [...known, ...siteTypes.filter((siteType) => !known.includes(siteType))];
}

/** One toggle per site type. The swatches are the globe's dot colours, so this is also the colour key. */
export function SiteTypeFilter(props: {
  siteTypes: string[];
  /** Sites per type index under the current time filter. */
  counts: number[] | null;
  hiddenTypes: ReadonlySet<string>;
  onToggle(siteType: string): void;
  onSolo(siteType: string): void;
  onShowAll(): void;
}) {
  const { siteTypes, counts, hiddenTypes } = props;
  return (
    <div className={styles.filter}>
      <ul className={styles.types} aria-label="Site types" onKeyDown={moveFocusInList}>
        {orderedTypes(siteTypes).map((siteType) => {
          const style = siteTypeStyle(siteType);
          const shown = !hiddenTypes.has(siteType);
          return (
            <li key={siteType} className={styles.row}>
              <button
                type="button"
                className={styles.type}
                data-list-item
                data-site-type={siteType}
                aria-pressed={shown}
                aria-keyshortcuts="O"
                onClick={() => props.onToggle(siteType)}
                // "O" is the keyboard's way to "only": the button beside it stays out of the tab order, or the list would be 26 stops long.
                onKeyDown={(event) => { if (event.key.toLowerCase() === "o" && !event.ctrlKey && !event.metaKey && !event.altKey) props.onSolo(siteType); }}
              >
                <i className={ui.swatch} style={{ ["--swatch" as string]: style.color }} />
                <span className={styles.title}>{style.title}</span>
                <span className={`${ui.numeric} ${styles.count}`}>
                  {counts ? (counts[siteTypes.indexOf(siteType)] ?? 0).toLocaleString("en-GB") : ""}
                </span>
              </button>
              <button type="button" className={styles.only} tabIndex={-1} aria-label={`Show only ${style.title.toLowerCase()}`} onClick={() => props.onSolo(siteType)}>
                only<kbd className={styles.onlyKey}>O</kbd>
              </button>
            </li>
          );
        })}
      </ul>
      {hiddenTypes.size ? (
        <button type="button" className={`${ui.chip} ${styles.all}`} data-action="show-all-types" onClick={props.onShowAll}>Show every type</button>
      ) : null}
    </div>
  );
}
