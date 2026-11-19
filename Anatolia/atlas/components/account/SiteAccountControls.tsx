"use client";

import type { SavedStatus } from "@/lib/account/accountBackend";
import ui from "../globe/chrome/chrome.module.css";
import styles from "./account.module.css";
import type { AccountViewModel } from "./useAccount";

const SAVE_CHOICES: { status: SavedStatus; label: string }[] = [
  { status: "want", label: "Want to visit" },
  { status: "visited", label: "Visited" },
];

/** On a site card: put the site on one of the visitor's two lists, and vote for it. Signed out, each button opens the sign-in. */
export function SiteAccountControls(props: { account: AccountViewModel; siteId: string; onRequestSignIn(): void }) {
  const { account, siteId } = props;
  const signedIn = account.session === "signedIn";
  const { saved, votes, loaded, error } = account.places;
  const voted = votes.includes(siteId);
  // Before the visitor's rows have arrived a press would be overwritten by them.
  const waiting = account.session === "loading" || (signedIn && !loaded);
  const act = (change: () => void) => (signedIn ? change() : props.onRequestSignIn());

  return (
    <div className={styles.siteControls} role="group" aria-label="Your lists and your vote" data-role="site-account">
      {SAVE_CHOICES.map((choice) => {
        const chosen = saved[siteId] === choice.status;
        return (
          <button
            key={choice.status} type="button" className={ui.chip} data-action={`save-${choice.status}`} aria-pressed={chosen} disabled={waiting}
            onClick={() => act(() => account.setSaved(siteId, chosen ? null : choice.status))}
          >
            {choice.label}
          </button>
        );
      })}
      <button
        type="button" className={ui.chip} data-action="vote" aria-pressed={voted} disabled={waiting}
        title="A vote says you find this place remarkable" onClick={() => act(() => account.setVote(siteId, !voted))}
      >
        Vote
      </button>
      {signedIn ? null : <span className={styles.hint}>Sign in to keep a list or vote.</span>}
      {signedIn && error ? <p className={styles.error} role="alert">{error}</p> : null}
    </div>
  );
}
