"use client";

import { useMemo } from "react";
import type { SavedStatus } from "@/lib/account/accountBackend";
import type { PickedSite } from "@/lib/globe/siteBlock";
import type { WorldCatalogue } from "@/lib/world/catalogueLoader";
import ui from "../globe/chrome/chrome.module.css";
import { PanelShell } from "../globe/chrome/PanelShell";
import styles from "./account.module.css";
import { SignInDialog } from "./SignInDialog";
import { SiteRowList } from "./SiteRowList";
import type { AccountViewModel } from "./useAccount";
import { useSitesById } from "./useSitesById";

const LISTS: { status: SavedStatus; title: string; empty: string }[] = [
  { status: "want", title: "Want to visit", empty: "Nothing yet. Open a site and choose “Want to visit”." },
  { status: "visited", title: "Visited", empty: "Nothing yet. Open a site and choose “Visited”." },
];

const DELETE_QUESTION = "Delete every site you saved and every vote you gave? This cannot be undone.";

/** The visitor's own space: the two lists, sign out, and deleting what they saved. Signed out, it is the sign-in. */
export function AccountPanel(props: {
  account: AccountViewModel;
  catalogue: WorldCatalogue | null;
  onVisit(site: PickedSite): void;
  onClose(): void;
}) {
  const { account } = props;
  const { saved, votes, loaded, error } = account.places;
  const savedIds = useMemo(() => Object.keys(saved), [saved]);
  const sites = useSitesById(props.catalogue, savedIds);
  if (account.session !== "signedIn") return <SignInDialog account={account} onClose={props.onClose} />;

  const footer = (
    <>
      <button type="button" className={ui.button} data-action="sign-out" onClick={account.signOut}>Sign out</button>
      <button
        type="button" className={ui.button} data-action="delete-saved-data" disabled={savedIds.length + votes.length === 0}
        onClick={() => { if (window.confirm(DELETE_QUESTION)) account.deleteSavedData(); }}
      >
        Delete my saved data
      </button>
    </>
  );

  return (
    <PanelShell dataRole="account-panel" eyebrow={account.email ? `Signed in as ${account.email}` : "Signed in"} title="Your places" closeName="your places" onClose={props.onClose} footer={footer}>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {LISTS.map((list) => {
        const listed = savedIds.filter((siteId) => saved[siteId] === list.status).flatMap((siteId) => sites?.get(siteId) ?? []);
        return (
          <section key={list.status} className={styles.section} aria-label={list.title} data-saved-list={list.status}>
            <h3 className={`${ui.eyebrow} ${styles.heading}`}>{list.title}<span className={ui.numeric}>{listed.length}</span></h3>
            {listed.length ? <SiteRowList sites={listed} onVisit={props.onVisit} /> : (
              <p className={styles.note}>{loaded && sites ? list.empty : "Loading…"}</p>
            )}
          </section>
        );
      })}
      <p className={styles.note}>
        You have voted for {votes.length} {votes.length === 1 ? "site" : "sites"}; a site&rsquo;s card shows your vote.
        Deleting your saved data removes these lists and your votes. The sign-in itself stays.
      </p>
    </PanelShell>
  );
}
