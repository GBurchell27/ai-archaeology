"use client";

import { SafeLink } from "@/components/SafeLink";
import type { WorldIndex } from "@/lib/world/catalogueTypes";
import ui from "./chrome.module.css";
import styles from "./AboutPanel.module.css";
import { PanelShell } from "./PanelShell";

const DATA_SOURCES_DOC = "https://github.com/GBurchell27/ai-archaeology/blob/main/docs/data-sources.md";

/** What the atlas is and is not, and whose records it shows. The source table is read live from the catalogue index. */
export function AboutPanel(props: { index: WorldIndex | null; onClose(): void }) {
  const { index } = props;
  return (
    <PanelShell dataRole="about-panel" title="About this atlas" closeLabel="Close the about panel" onClose={props.onClose}>
      <div className={`${ui.prose} ${styles.about}`}>
        <p className={`${ui.serif} ${styles.lead}`}>
          A globe of archaeological sites that have already been published, for reading and for looking at the land they sit in.
        </p>
        <h3 className={ui.eyebrow}>What a pin means</h3>
        <p>
          A pin is a published record, not a discovery. Every point comes from an open catalogue and links back to its entry there.
          Nothing here locates an unrecorded place, and nothing here has been checked on the ground by this project.
        </p>
        <h3 className={ui.eyebrow}>Why some regions look empty</h3>
        <p>
          Blank areas mostly show where surveys and open data are thin, not where people were absent. The Mediterranean is dense
          because its gazetteers are old and thorough; much of Africa, Central Asia and the Amazon is sparse because far less has been catalogued in the open.
        </p>
        <h3 className={ui.eyebrow}>Dates and labels</h3>
        <p>
          Dates are the sources&rsquo; own and are often rough or missing; undated sites can be hidden from the time filter.
          The wonders are a hand-picked list. A few are marked contested, or natural or pseudo-archaeology, so the claim can be read against the evidence.
        </p>
        <h3 className={ui.eyebrow}>Sources</h3>
        {index ? <SourceTable index={index} /> : <p>Loading the catalogue…</p>}
        <p className={styles.small}>
          Licences and download details for every dataset are in{" "}
          <SafeLink href={DATA_SOURCES_DOC}>docs/data-sources.md</SafeLink> in the project repository.
          {index ? ` Catalogue built ${index.generated}.` : ""}
        </p>
        <p className={styles.small}>A private hobby project. It is a reading aid, not a research result.</p>
      </div>
    </PanelShell>
  );
}

function SourceTable(props: { index: WorldIndex }) {
  return (
    <table className={styles.sources}>
      <thead>
        <tr><th scope="col">Source</th><th scope="col">Records</th><th scope="col">Licence</th></tr>
      </thead>
      <tbody>
        {props.index.sources.map((source) => (
          <tr key={source.id}>
            <th scope="row">
              <SafeLink href={source.url}>{source.name}</SafeLink>
              <span className={styles.attribution}>{source.attribution}</span>
            </th>
            <td className={ui.numeric}>{source.count.toLocaleString("en-GB")}</td>
            <td>{source.licence}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
