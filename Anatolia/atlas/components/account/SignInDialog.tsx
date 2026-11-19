"use client";

import { useState } from "react";
import { WHAT_AN_ACCOUNT_STORES } from "@/lib/account/voteLeaderboard";
import ui from "../globe/chrome/chrome.module.css";
import { PanelShell } from "../globe/chrome/PanelShell";
import styles from "./account.module.css";
import { EmailCodeSignIn } from "./EmailCodeSignIn";
import type { AccountViewModel } from "./useAccount";

const GOOGLE_FAILED = "The Google sign-in could not start. Try again.";

/** Sign in with Google, or with a code sent to an email address. Says what an account stores before anything is sent. */
export function SignInDialog(props: { account: AccountViewModel; onClose(): void }) {
  const { account } = props;
  const [notice, setNotice] = useState<string | null>(null);

  async function startGoogle(): Promise<void> {
    setNotice(null);
    if (!(await account.signInWithGoogle())) setNotice(GOOGLE_FAILED);
  }

  return (
    <PanelShell dataRole="sign-in-dialog" eyebrow="Optional" title="Sign in" closeLabel="Close the sign-in" onClose={props.onClose}>
      <p className={styles.intro}>
        The atlas stays open without an account. Signing in lets you keep a list of sites you want to visit and sites you
        have visited, and vote for the places you find most remarkable.
      </p>
      <p className={styles.note} data-role="account-stores">{WHAT_AN_ACCOUNT_STORES}</p>
      <div className={styles.signIn}>
        <button
          type="button" className={`${ui.button} ${ui.buttonPrimary}`} data-action="sign-in-google"
          disabled={account.session === "loading"} onClick={() => void startGoogle()}
        >
          Continue with Google
        </button>
        <EmailCodeSignIn account={account} onNotice={setNotice} />
        <p className={styles.note} role="status" data-role="sign-in-notice">{notice}</p>
      </div>
    </PanelShell>
  );
}
