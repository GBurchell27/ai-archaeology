"use client";

import { useState, type FormEvent } from "react";
import ui from "../globe/chrome/chrome.module.css";
import styles from "./account.module.css";
import type { AccountViewModel } from "./useAccount";

const NOTICES = {
  sent: "A sign-in code is on its way to that address. Type it below.",
  notSent: "The code could not be sent. Check the address and try again.",
  wrongCode: "That code did not work. Check it, or have a new one sent.",
};

/** Sign in with a code sent to an email address: first the address, then the code. There is no password. */
export function EmailCodeSignIn(props: { account: AccountViewModel; onNotice(notice: string | null): void }) {
  const { account, onNotice } = props;
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  /** The address a code was sent to; null before one is. */
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);

  async function sendCode(event: FormEvent): Promise<void> {
    event.preventDefault();
    onNotice(null);
    const address = email.trim();
    const sent = await account.sendSignInCode(address);
    setCodeSentTo(sent ? address : null);
    onNotice(sent ? NOTICES.sent : NOTICES.notSent);
  }
  async function submitCode(event: FormEvent): Promise<void> {
    event.preventDefault();
    onNotice(null);
    // On success the panel becomes "Your places" and this form is gone.
    if (codeSentTo && !(await account.signInWithCode(codeSentTo, code.trim()))) onNotice(NOTICES.wrongCode);
  }

  return (
    <>
      <form className={styles.emailForm} onSubmit={(event) => void sendCode(event)}>
        <label className={styles.fieldLabel}>
          Or have a sign-in code sent to your email address. There is no password.
          <input
            className={ui.textField} type="email" name="email" autoComplete="email" required
            placeholder="you@example.org" value={email} onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <button type="submit" className={ui.button} data-action="sign-in-email" disabled={account.session === "loading"}>
          {codeSentTo ? "Send a new code" : "Send the code"}
        </button>
      </form>
      {codeSentTo ? (
        <form className={styles.emailForm} onSubmit={(event) => void submitCode(event)}>
          <label className={styles.fieldLabel}>
            The code from the email
            <input
              className={ui.textField} type="text" name="code" inputMode="numeric" autoComplete="one-time-code" required
              value={code} onChange={(event) => setCode(event.target.value)}
            />
          </label>
          <button type="submit" className={`${ui.button} ${ui.buttonPrimary}`} data-action="sign-in-code">Sign in</button>
        </form>
      ) : null}
    </>
  );
}
