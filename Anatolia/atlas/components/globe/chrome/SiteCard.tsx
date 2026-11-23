"use client";

import { useEffect, useState } from "react";
import { walkOfferedOnGlobe } from "@/lib/globe/walkHandoff";
import { loadSiteDetail } from "@/lib/world/catalogueLoader";
import type { FeaturedSite, SiteDetail } from "@/lib/world/catalogueTypes";
import { isSiteInAtlas } from "@/lib/world/sitePick";
import { siteTypeStyle } from "@/lib/world/siteTypeStyle";
import { WONDER_STATUS } from "@/lib/world/wonders";
import { formatSiteDates } from "@/lib/world/worldEras";
import type { PickedSite } from "../GlobeSites";
import { ShareButton } from "@/components/share/ShareButton";
import { shareDescription, shareTitle } from "@/lib/share/shareCopy";
import { siteSharePath } from "@/lib/share/shareAddress";
import ui from "./chrome.module.css";
import { PanelShell } from "./PanelShell";
import styles from "./SiteCard.module.css";
import { SiteCardRecord } from "./SiteCardRecord";
import { SiteNews } from "@/components/SiteNews";
import { SiteTheories } from "@/components/theories/SiteTheories";
import { SiteAccountControls } from "@/components/account/SiteAccountControls";
import type { AccountViewModel } from "@/components/account/useAccount";
import { isAccountSiteId } from "@/lib/account/accountSiteId";

/** The close-up service refuses windows this near the poles. */
const CLOSEUP_LATITUDE_LIMIT = 80;

/** `undefined` while the record is on its way, `null` when the catalogue has none. */
function useSiteDetail(siteId: string): SiteDetail | null | undefined {
  const [loaded, setLoaded] = useState<{ siteId: string; detail: SiteDetail | null } | null>(null);
  useEffect(() => {
    let live = true;
    void loadSiteDetail(siteId).then((detail) => { if (live) setLoaded({ siteId, detail }); });
    return () => { live = false; };
  }, [siteId]);
  return loaded?.siteId === siteId ? loaded.detail : undefined;
}

/** Everything the catalogue says about the picked site, and the ways onward from it. */
export function SiteCard(props: {
  site: PickedSite;
  /** The curated entry, when the site is one of the wonders. */
  wonder: FeaturedSite | null;
  onClose(): void;
  onFlyCloser(): void;
  onOpenPlace(siteId: string): void;
  onEnterAtlas(site: PickedSite): void;
  /** "Walk the site", on the card of a site whose walk is reached from the globe. */
  onEnterWalk(siteId: string): void;
  /** A theory picked from the card's questions: the Theories panel opens on it. */
  onOpenTheory(theoryId: string): void;
  /** Null when accounts are not configured: the card then has no save or vote controls. */
  account: AccountViewModel | null;
  onRequestSignIn(): void;
}) {
  const { site, wonder } = props;
  const detail = useSiteDetail(site.id);
  const style = siteTypeStyle(site.siteType);
  const dates = formatSiteDates(site.startYear, site.endYear);
  const status = wonder ? WONDER_STATUS[wonder.status] : null;
  // The close-up finds a site through its detail record, so without one there is no terrain to offer.
  const hasCloseup = detail !== null && Math.abs(site.lat) <= CLOSEUP_LATITUDE_LIMIT;

  const footer = (
    <>
      <button type="button" className={ui.button} data-action="fly-closer" onClick={props.onFlyCloser}>Fly closer</button>
      {isSiteInAtlas(site) ? (
        <button type="button" className={`${ui.button} ${ui.buttonPrimary}`} data-action="open-in-atlas" onClick={() => props.onEnterAtlas(site)}>
          Open in Anatolia atlas
        </button>
      ) : hasCloseup ? (
        <button type="button" className={`${ui.button} ${ui.buttonPrimary}`} data-action="view-terrain" onClick={() => props.onOpenPlace(site.id)}>
          View terrain
        </button>
      ) : null}
      {walkOfferedOnGlobe(site.id) ? (
        <button type="button" className={`${ui.button} ${ui.buttonPrimary}`} data-action="walk-site" onClick={() => props.onEnterWalk(site.id)}>
          Walk the site
        </button>
      ) : null}
      <ShareButton
        className={ui.button}
        dataAction="share-site"
        label="Share"
        ariaLabel={`Share ${site.name}`}
        title={shareTitle(site.name)}
        text={shareDescription({ why: wonder?.why, kind: style.title.toLowerCase() })}
        url={() => {
          const path = siteSharePath(site.id, site.name);
          return path ? `${window.location.origin}${path}` : window.location.href;
        }}
      />
    </>
  );

  return (
    <PanelShell
      dataRole="site-card"
      eyebrow={<><i className={ui.swatch} style={{ ["--swatch" as string]: style.color }} />{style.title}{wonder ? <span className={styles.wonderMark}>Wonder</span> : null}</>}
      title={site.name}
      closeName={site.name}
      onClose={props.onClose}
      footer={footer}
    >
      <p className={`${ui.numeric} ${styles.dates}`}>
        {dates ?? "No dates recorded in the catalogue"}
        {wonder ? <span className={ui.muted}> · {[wonder.period, wonder.country].filter(Boolean).join(", ")}</span> : null}
      </p>
      {/* The visitor's own lists and vote, not part of the record. OpenStreetMap records are left out of both. */}
      {props.account && isAccountSiteId(site.id) ? (
        <SiteAccountControls account={props.account} siteId={site.id} onRequestSignIn={props.onRequestSignIn} />
      ) : null}
      {wonder ? <p className={`${ui.serif} ${styles.why}`}>{wonder.why}</p> : null}
      {status ? (
        <p className={styles.status}><span className={ui.badge}>{status.badge}</span>{status.note}</p>
      ) : null}
      <SiteCardRecord key={site.id} site={site} detail={detail} />
      {/* After the record: reports, then questions. Neither is part of the published record. */}
      <SiteNews siteId={site.id} className={styles.news} headingClassName={ui.eyebrow} />
      <SiteTheories siteId={site.id} onOpenTheory={props.onOpenTheory} className={styles.theories} headingClassName={ui.eyebrow} />
    </PanelShell>
  );
}
