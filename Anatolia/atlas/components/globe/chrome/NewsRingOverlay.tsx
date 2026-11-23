"use client";

// The rings on screen. GlobeNewsRings moves them; this only owns the elements,
// so a narrow screen can show them without opening a panel.

import type { NewsPin } from "../useNewsPins";
import styles from "./NewsRingOverlay.module.css";

/** One still or pulsing ring per site the filters leave on the globe. Hidden until a frame places it. */
export function NewsRingOverlay(props: { pins: readonly NewsPin[]; shown: boolean; omitId: string | null }) {
  if (!props.shown) return null;
  const pins = props.omitId ? props.pins.filter((pin) => pin.site.id !== props.omitId) : props.pins;
  if (pins.length === 0) return null;
  return (
    <div className={styles.overlay} data-role="news-ring-overlay" aria-hidden="true">
      {pins.map((pin) => <span key={pin.site.id} className={styles.newsRing} data-role="news-site-ring" data-site={pin.site.id} />)}
    </div>
  );
}
