"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { copyText } from "@/components/globe/chrome/copyText";
import { shareChannel } from "@/lib/share/shareChannel";
import styles from "./ShareButton.module.css";

const NOTICE_MS = 2200;
const NARROW = "(max-width: 800px)";
const COARSE = "(pointer: coarse)";

function ShareIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="4" cy="8" r="1.7" />
      <circle cx="11.5" cy="4.2" r="1.7" />
      <circle cx="11.5" cy="11.8" r="1.7" />
      <path d="m5.6 7.2 4.4-2.2M5.6 8.8l4.4 2.2" />
    </svg>
  );
}

async function nativeShare(payload: { title: string; text: string; url: string }): Promise<"shared" | "cancelled" | "failed"> {
  if (typeof navigator.share !== "function") return "failed";
  try {
    await navigator.share(payload);
    return "shared";
  } catch (error) {
    return error instanceof DOMException && error.name === "AbortError" ? "cancelled" : "failed";
  }
}

/** Share a link: the system sheet on a phone, and a copied link with a toast on a desktop. */
export function ShareButton(props: {
  label: string;
  ariaLabel: string;
  title: string;
  text: string;
  url(): string;
  className?: string;
  labelClassName?: string;
  dataAction: string;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function share(): Promise<void> {
    const payload = { title: props.title, text: props.text, url: props.url() };
    const channel = shareChannel({
      nativeShare: typeof navigator.share === "function",
      coarsePointer: window.matchMedia(COARSE).matches,
      narrow: window.matchMedia(NARROW).matches,
    });
    if (channel === "native") {
      const outcome = await nativeShare(payload);
      if (outcome !== "failed") return;
    }
    const copied = await copyText(payload.url);
    setNotice(copied ? "Link copied" : "Could not copy the link");
  }

  return (
    <>
      <button type="button" className={props.className} style={{ display: "inline-flex", alignItems: "center", gap: 7 }} data-action={props.dataAction} aria-label={props.ariaLabel} onClick={() => void share()}>
        <ShareIcon />
        <span className={props.labelClassName}>{props.label}</span>
      </button>
      {notice ? createPortal(<p className={styles.toast} role="status">{notice}</p>, document.body) : null}
    </>
  );
}
