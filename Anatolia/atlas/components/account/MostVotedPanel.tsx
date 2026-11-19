"use client";

import { useEffect, useMemo, useState } from "react";
import type { SiteVoteCount } from "@/lib/account/accountBackend";
import { WHAT_A_VOTE_MEANS } from "@/lib/account/voteLeaderboard";
import type { PickedSite } from "@/lib/globe/siteBlock";
import type { WorldCatalogue } from "@/lib/world/catalogueLoader";
import { PanelShell } from "../globe/chrome/PanelShell";
import styles from "./account.module.css";
import { SiteRowList } from "./SiteRowList";
import { useSitesById } from "./useSitesById";

/** `null` while loading, "failed" when the totals could not be read. Read afresh each time the panel opens. */
function useVoteCounts(loadVoteCounts: () => Promise<SiteVoteCount[]>): SiteVoteCount[] | "failed" | null {
  const [counts, setCounts] = useState<SiteVoteCount[] | "failed" | null>(null);
  useEffect(() => {
    let live = true;
    loadVoteCounts().then((loaded) => { if (live) setCounts(loaded); }, () => { if (live) setCounts("failed"); });
    return () => { live = false; };
  }, [loadVoteCounts]);
  return counts;
}

const NO_COUNTS: SiteVoteCount[] = [];

/** The public list of the sites with the most votes. Open to everyone; it shows totals and never who voted. */
export function MostVotedPanel(props: {
  loadVoteCounts(): Promise<SiteVoteCount[]>;
  catalogue: WorldCatalogue | null;
  onVisit(site: PickedSite): void;
  onClose(): void;
}) {
  const loaded = useVoteCounts(props.loadVoteCounts);
  const counts = Array.isArray(loaded) ? loaded : NO_COUNTS;
  const siteIds = useMemo(() => counts.map((count) => count.siteId), [counts]);
  const sites = useSitesById(props.catalogue, siteIds);
  const votes = useMemo(() => new Map(counts.map((count) => [count.siteId, count.votes])), [counts]);
  const listed = counts.flatMap((count) => sites?.get(count.siteId) ?? []);
  const pending = loaded === null || (counts.length > 0 && sites === null);

  return (
    <PanelShell dataRole="most-voted-panel" eyebrow="Visitors’ favourites" title="Most voted" closeLabel="Close the most voted list" onClose={props.onClose}>
      <p className={styles.intro} data-role="vote-meaning">{WHAT_A_VOTE_MEANS}</p>
      {loaded === "failed" ? <p className={styles.error} role="alert">The votes could not be loaded. Close this list and open it again to retry.</p> : null}
      {pending ? <p className={styles.note}>Loading…</p> : null}
      {!pending && loaded !== "failed" && !listed.length ? <p className={styles.note}>No votes yet. Sign in, open a site and choose “Vote”.</p> : null}
      {listed.length ? (
        <SiteRowList
          ordered sites={listed} onVisit={props.onVisit}
          aside={(site) => { const total = votes.get(site.id) ?? 0; return `${total} ${total === 1 ? "vote" : "votes"}`; }}
        />
      ) : null}
    </PanelShell>
  );
}
