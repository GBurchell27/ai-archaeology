"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { CloseButton } from "@/components/chrome/CloseButton";
import ui from "./chrome.module.css";
import styles from "./PanelShell.module.css";

/**
 * The frame every side panel and the site card share: a non-modal dialog with a serif title and a close button.
 * Focus moves into it when it opens and goes back to where it came from when it closes.
 */
export function PanelShell(props: {
  title: ReactNode;
  /** Small line above the title. */
  eyebrow?: ReactNode;
  /** Spoken as "Close {closeName}". */
  closeName: string;
  onClose(): void;
  /** Fixed content between the title and the scrolling body (filters, tour controls). */
  toolbar?: ReactNode;
  /** Fixed content under the scrolling body (actions). */
  footer?: ReactNode;
  children: ReactNode;
  dataRole: string;
}) {
  const titleId = useId();
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const element = panel.current;
    element?.focus({ preventScroll: true });
    return () => {
      // Only hand focus back if it was still inside the panel; the user may have moved on.
      if (element?.contains(document.activeElement) || document.activeElement === document.body) opener?.focus();
    };
  }, []);

  return (
    <section ref={panel} className={`${ui.glass} ${styles.panel}`} role="dialog" aria-modal="false" aria-labelledby={titleId} tabIndex={-1} data-role={props.dataRole}>
      <header className={styles.head}>
        <div className={styles.titles}>
          {props.eyebrow ? <div className={`${ui.eyebrow} ${styles.eyebrow}`}>{props.eyebrow}</div> : null}
          <h2 id={titleId} className={`${ui.serif} ${styles.title}`}>{props.title}</h2>
        </div>
        <CloseButton name={props.closeName} action="close-panel" onClick={props.onClose} />
      </header>
      {props.toolbar ? <div className={styles.toolbar}>{props.toolbar}</div> : null}
      <div className={`${ui.scroll} ${styles.body}`}>{props.children}</div>
      {props.footer ? <footer className={styles.footer}>{props.footer}</footer> : null}
    </section>
  );
}
