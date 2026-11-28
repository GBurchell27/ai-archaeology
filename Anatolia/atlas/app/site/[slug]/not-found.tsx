import Link from "next/link";
import styles from "./not-found.module.css";

/** An id the catalogue does not hold, including anything that was never published. */
export default function MissingSite() {
  return (
    <main className={styles.missing}>
      <p className={styles.eyebrow}>Atlas of early monuments</p>
      <h1>This site is not in the catalogue</h1>
      <p>Share pages exist only for published records. An unknown id has no page.</p>
      <Link href="/">Back to the globe</Link>
    </main>
  );
}
