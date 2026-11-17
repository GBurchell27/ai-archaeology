import styles from "./WalkOffer.module.css";

/** The prompt shown while the camera is close over a walkable site. Zooming on enters without it. */
export function WalkOffer(props: { siteName: string; onWalk: () => void }) {
  return (
    <button type="button" className={styles.offer} data-action="walk-offer" onClick={props.onWalk}>
      <span className={styles.title}>Walk {props.siteName}</span>
      <span className={styles.hint}>or keep zooming in</span>
    </button>
  );
}
