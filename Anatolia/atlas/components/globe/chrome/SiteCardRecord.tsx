"use client";

import { useState } from "react";
import { SafeLink } from "@/components/SafeLink";
import type { SiteDetail } from "@/lib/world/catalogueTypes";
import { commonsFilePage, commonsThumbnail, osmElementPage } from "@/lib/world/siteMedia";
import { OSM_MEGALITH_STYLE } from "@/lib/world/siteTypeStyle";
import type { PickedSite } from "../GlobeSites";
import ui from "./chrome.module.css";
import styles from "./SiteCard.module.css";

const THUMBNAIL_WIDTH = 640;

/** The lazily loaded half of the site card: picture, links, heritage labels, and who the record belongs to. */
export function SiteCardRecord(props: { site: PickedSite; detail: SiteDetail | null | undefined }) {
  const { site, detail } = props;
  if (detail === undefined) return <p className={styles.loading} role="status">Fetching the record…</p>;
  if (detail === null) {
    const osmPage = osmElementPage(site.id);
    return (
      <>
        {osmPage ? (
          <ul className={`${ui.prose} ${styles.links}`}><li><SafeLink href={osmPage}>Open it on OpenStreetMap</SafeLink></li></ul>
        ) : <p className={styles.loading}>The catalogue holds no further record for this site.</p>}
        {site.source === "osm" ? <OsmCredit /> : null}
      </>
    );
  }
  return (
    <>
      <SitePicture name={site.name} image={detail.image} />
      {detail.heritage.length ? (
        <ul className={styles.heritage} aria-label="Heritage listings">
          {detail.heritage.map((label) => <li key={label}>{label}</li>)}
        </ul>
      ) : null}
      {detail.types.length ? (
        <p className={styles.fact}><span className={ui.eyebrow}>Recorded as</span>{detail.types.join(", ")}</p>
      ) : null}
      {detail.datingSource === "c14" ? (
        <p className={styles.fact} data-role="dating-note">
          <span className={ui.eyebrow}>Dating</span>
          From radiocarbon samples matched to this site by name, roughly calibrated. Read the years as ± a few centuries.
        </p>
      ) : null}
      <ul className={`${ui.prose} ${styles.links}`}>
        {detail.wikipedia ? <li><SafeLink href={detail.wikipedia}>Read about it on Wikipedia</SafeLink></li> : null}
        <li><SafeLink href={detail.sourceUrl}>Open the source record</SafeLink></li>
      </ul>
      {site.source === "osm" ? <OsmCredit /> : (
        <p className={styles.credit}>Record: {detail.attribution}, {detail.licence}.</p>
      )}
    </>
  );
}

function OsmCredit() {
  return (
    <p className={`${ui.prose} ${styles.credit}`}>
      <SafeLink href={OSM_MEGALITH_STYLE.attributionUrl}>{OSM_MEGALITH_STYLE.attribution}</SafeLink>. Shown as a separate layer under its own share-alike licence.
    </p>
  );
}

/** A width-limited Commons picture. If it will not load, the card simply goes without. */
function SitePicture(props: { name: string; image: string | null }) {
  const [failed, setFailed] = useState(false);
  const source = commonsThumbnail(props.image, THUMBNAIL_WIDTH);
  if (!source || failed) return null;
  return (
    <figure className={styles.picture}>
      <img src={source} alt={`${props.name}, photograph from Wikimedia Commons`} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      <figcaption className={ui.prose}>
        <SafeLink href={commonsFilePage(props.image)}>Wikimedia Commons</SafeLink>: author and licence on the file page
      </figcaption>
    </figure>
  );
}
