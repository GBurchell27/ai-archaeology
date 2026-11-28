"use client";

// The legend's list of sites with a recent report. Choosing one flies there.
// It lives in the legend, which starts closed on a narrow screen, so nothing pops open on its own.

import { useId } from "react";
import { NEWS_RECENCY_DAYS, newsPinCaption } from "@/lib/news/recentNews";
import { formatNewsDate } from "@/lib/news/siteNews";
import type { PickedSite } from "@/lib/globe/siteBlock";
import type { NewsPin } from "../useNewsPins";
import ui from "./chrome.module.css";
import styles from "./NewsPinList.module.css";

/** The switch and the sites. `ready` is false until the catalogue has loaded, so an empty list is not claimed early. */
export function NewsPinList(props: {
  pins: readonly NewsPin[];
  ready: boolean;
  shown: boolean;
  onShown(shown: boolean): void;
  onShowSite(site: PickedSite): void;
}) {
  const headingId = useId();
  return (
    <section className={styles.news} data-role="news-pin-list" aria-labelledby={headingId}>
      <NewsPinSwitch shown={props.shown} headingId={headingId} onShown={props.onShown} />
      <p className={styles.note}>
        A ring marks a catalogue site the globe is showing, when it has a report from the last {NEWS_RECENCY_DAYS} days. A report does not change its record.
      </p>
      <NewsPinRows pins={props.pins} ready={props.ready} onShowSite={props.onShowSite} />
    </section>
  );
}

function NewsPinSwitch(props: { shown: boolean; headingId: string; onShown(shown: boolean): void }) {
  return (
    <label className={ui.switch}>
      <input
        type="checkbox"
        data-role="news-pins"
        checked={props.shown}
        onChange={(event) => props.onShown(event.target.checked)}
      />
      <span className={ui.switchTrack} />
      <span id={props.headingId} className={styles.heading}>In the news</span>
    </label>
  );
}

function NewsPinRows(props: { pins: readonly NewsPin[]; ready: boolean; onShowSite(site: PickedSite): void }) {
  if (!props.ready) return null;
  if (props.pins.length === 0) return <p className={styles.empty}>No report in the last {NEWS_RECENCY_DAYS} days.</p>;
  return (
    <ul className={styles.list}>
      {props.pins.map((pin) => <NewsPinRow key={pin.site.id} pin={pin} onShowSite={props.onShowSite} />)}
    </ul>
  );
}

function NewsPinRow(props: { pin: NewsPin; onShowSite(site: PickedSite): void }) {
  const { site, item } = props.pin;
  return (
    <li>
      <button
        type="button"
        className={styles.row}
        data-action="show-news-site"
        data-site={site.id}
        data-news={item.id}
        onClick={() => props.onShowSite(site)}
      >
        <span className={styles.name}>{site.name}</span>
        <span className={styles.meta}>
          <time dateTime={item.date}>{formatNewsDate(item.date)}</time>
          {" · "}
          {newsPinCaption(item)}
        </span>
      </button>
    </li>
  );
}
