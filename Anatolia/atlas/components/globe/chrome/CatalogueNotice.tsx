"use client";

import ui from "./chrome.module.css";
import styles from "./CatalogueNotice.module.css";

/** Shown in place of the timeline when the catalogue cannot be fetched: what happened, and the one way forward. */
export function CatalogueNotice(props: { reason: string }) {
  return (
    <section className={`${ui.glass} ${styles.notice}`} role="alert" data-role="catalogue-error">
      <h2 className={`${ui.serif} ${styles.title}`}>The site catalogue did not load</h2>
      <p className={styles.text}>The globe works, but there are no sites to put on it yet. Check the connection, then load the page again.</p>
      <p className={styles.reason}>{props.reason}</p>
      <button type="button" className={`${ui.button} ${ui.buttonPrimary}`} data-action="reload" onClick={() => window.location.reload()}>
        Load again
      </button>
    </section>
  );
}
