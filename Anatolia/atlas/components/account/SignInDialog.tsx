"use client";

import { useState, type FormEvent } from "react";
import { WHAT_AN_ACCOUNT_STORES } from "@/lib/account/voteLeaderboard";
import ui from "../globe/chrome/chrome.module.css";
import { PanelShell } from "../globe/chrome/PanelShell";
import styles from "./account.module.css";
import type { AccountViewModel } from "./useAccount";

const NOTICES = {
  sent: "A sign-in link is on its way. Open it in this browser.",
  failed: "That did not work. Check the address and try again.",
  googleFailed: "The Google sign-in could not start. Try again.",
};

/** Sign in with Google or by a link sent to an email address. Says what an account stores before anything is sent. */
export function SignInDialog(props: { account: AccountViewModel; onClose(): void }) {
  const { account } = props;
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const waiting = account.session === "loading";

  async function sendLink(event: FormEvent): Promise<void> {
    event.preventDefault();
    setNotice(null);
    setNotice((await account.sendSignInLink(email.trim())) ? NOTICES.sent : NOTICES.failed);
  }
  async function startGoogle(): Promise<void> {
    setNotice(null);
    if (!(await account.signInWithGoogle())) setNotice(NOTICES.googleFailed);
  }

  return (
    <PanelShell dataRole="sign-in-dialog" eyebrow="Optional" title="Sign in" closeLabel="Close the sign-in" onClose={props.onClose}>
      <p className={styles.intro}>
        The atlas stays open without an account. Signing in lets you keep a list of sites you want to visit and sites you
        have visited, and vote for the places you find most remarkable.
      </p>
      <p className={styles.note} data-role="account-stores">{WHAT_AN_ACCOUNT_STORES}</p>
      <div className={styles.signIn}>
        <button type="button" className={`${ui.button} ${ui.buttonPrimary}`} data-action="sign-in-google" disabled={waiting} onClick={() => void startGoogle()}>
          Continue with Google
        </button>
        <form className={styles.emailForm} onSubmit={(event) => void sendLink(event)}>
          <label className={styles.fieldLabel}>
            Or have a sign-in link sent to your email address
            <input
              className={ui.textField} type="email" name="email" autoComplete="email" required
              placeholder="you@example.org" value={email} onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <button type="submit" className={ui.button} data-action="sign-in-email" disabled={waiting}>Send the link</button>
        </form>
        <p className={styles.note} role="status" data-role="sign-in-notice">{notice}</p>
      </div>
    </PanelShell>
  );
}
