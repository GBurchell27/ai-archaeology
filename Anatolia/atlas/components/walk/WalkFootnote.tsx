"use client";

import type { WalkModel } from "@/lib/walk/enclosureModel";
import { hypothesisFootnote, type HypothesisLayerId } from "@/lib/walk/hypothesisLayers";
import type { WalkSite } from "@/lib/walk/walkSites";
import styles from "./WalkView.module.css";

/** The line that always shows. The detail behind it may be closed, so this alone must say what is on screen. */
const MODEL_SUMMARY = "A schematic model from published dimensions, not a survey.";
const PHOTOGRAPHS_SUMMARY = "A reconstruction from visitors' photographs, not a survey.";

function ModelLimits({ model }: { model: WalkModel }) {
  return (
    <>
      <p>{model.note}</p>
      <p>
        Sources:{" "}
        {model.sources.map((source, index) => (
          <span key={source.url}>
            {index > 0 ? ", " : null}
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.label}
            </a>
            {source.licenceUrl ? (
              <>
                {" "}
                (
                <a href={source.licenceUrl} target="_blank" rel="noreferrer">
                  CC BY 4.0
                </a>
                )
              </>
            ) : null}
          </span>
        ))}
      </p>
    </>
  );
}

function PhotographLimits({ site }: { site: WalkSite }) {
  return (
    <p>
      Anything the photographs did not see is guessed or missing.{" "}
      <a href={site.creditsUrl} target="_blank" rel="noreferrer">
        Photograph credits and licences
      </a>
    </p>
  );
}

type SourceFootnoteProps = { site: WalkSite; model: WalkModel | null; hypotheses: readonly HypothesisLayerId[] };

/** Says what the reconstruction on screen is made from, and so how far to trust it. Limits and sources open on request. */
export function SourceFootnote({ site, model, hypotheses }: SourceFootnoteProps) {
  const conjecture = model ? hypothesisFootnote(model.hypotheses, hypotheses) : "";
  return (
    <footer className={styles.footer} data-role="walk-footnote">
      {model ? MODEL_SUMMARY : PHOTOGRAPHS_SUMMARY}
      {conjecture ? <strong> {conjecture}</strong> : null}
      <details>
        <summary>Limits and sources</summary>
        {model ? <ModelLimits model={model} /> : <PhotographLimits site={site} />}
      </details>
    </footer>
  );
}
