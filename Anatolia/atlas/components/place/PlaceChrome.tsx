"use client";

import { SafeLink } from "@/components/SafeLink";
import { ViewShareButton } from "@/components/share/ViewShareButton";
import type { ScaleBar } from "@/lib/place/placeGeometry";
import type { PlaceSite } from "@/lib/place/placeSite";
import type { CloseupMeta } from "@/lib/place/placeTerrain";
import styles from "./PlaceView.module.css";

export const HONEST_LINE = "15 m surface model. It shows landforms, not buildings; small monuments are below its resolution.";

export function PlaceHeader(props: { site: PlaceSite | null | undefined; siteId: string; onExit: () => void }) {
  const { site } = props;
  const facts = site ? [site.kind, site.dates, site.country].filter(Boolean) : [];
  return (
    <header className={styles.header}>
      <div className={styles.tools}>
        <button type="button" className={styles.back} onClick={props.onExit} aria-keyshortcuts="Escape">
          <span aria-hidden="true">←</span> Globe
        </button>
        <ViewShareButton className={styles.back} />
      </div>
      <h1 className={styles.name}>{site ? site.name : site === null ? props.siteId : " "}</h1>
      {facts.length ? <p className={styles.facts}>{facts.join(" · ")}</p> : null}
      {site?.why ? <p className={styles.why}>{site.why}</p> : null}
    </header>
  );
}

export function NorthArrow({ heading }: { heading: number }) {
  return (
    <div className={styles.north} role="img" aria-label={`North arrow. The view looks towards ${Math.round(heading)} degrees.`}>
      <svg viewBox="0 0 40 40" style={{ transform: `rotate(${-heading}deg)` }} aria-hidden="true">
        <circle cx="20" cy="20" r="18.5" />
        <path d="M20 13 L24.5 29 L20 26 L15.5 29 Z" />
        <text x="20" y="11" textAnchor="middle" transform={`rotate(${heading} 20 8)`}>N</text>
      </svg>
    </div>
  );
}

/** Up to the first sentence break, link or dash: enough to name the source in one line. */
function shortCredit(text: string): string {
  return text.split(/\. | https?:| — /)[0];
}

export function PlaceFooter(props: { meta: CloseupMeta; site: PlaceSite | null | undefined; bar: ScaleBar | null }) {
  const { meta, site, bar } = props;
  return (
    <footer className={styles.footer}>
      {bar ? (
        <p className={styles.scale} aria-label={`Scale: ${bar.label} at the centre of the view`}>
          <span className={styles.scaleBar} style={{ width: bar.pixels }} />
          <span>{bar.label} at centre</span>
        </p>
      ) : null}
      <p className={styles.honest}>{HONEST_LINE}</p>
      <details className={styles.credits}>
        <summary>
          {shortCredit(meta.attribution.relief)} · {shortCredit(meta.attribution.satellite)}
          {site?.recordCredit ? ` · Site record: ${site.recordCredit}` : ""} · <u>full credits</u>
        </summary>
        <p><b>Relief</b> {meta.attribution.relief}</p>
        <p><b>Imagery</b> {meta.attribution.satellite}</p>
        {site?.recordCredit ? (
          <p>
            <b>Site record</b> {site.recordCredit}
            {site.recordUrl ? <> · <SafeLink href={site.recordUrl}>source</SafeLink></> : null}
          </p>
        ) : null}
      </details>
    </footer>
  );
}
