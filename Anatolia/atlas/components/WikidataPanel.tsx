"use client";

import { PERIOD_COLOR, PERIOD_SPAN, type WikiFeature } from "@/lib/wikidata";

const AXIS: [number, number] = [-9600, 1600];

export function WikidataPanel(props: { site: WikiFeature; onClose: () => void }) {
  const properties = props.site.properties;
  const segments = properties.periods.map((period) => {
    const [periodStart, periodEnd] = PERIOD_SPAN[period];
    const start = properties.startYear ?? periodStart;
    const end = properties.endYear ?? periodEnd;
    return {
      period,
      left: _percent(Math.max(start, periodStart)),
      width: Math.max(1.2, _percent(Math.min(end, periodEnd)) - _percent(Math.max(start, periodStart))),
    };
  });
  return (
    <aside className="panel is-in wiki-panel" aria-label="Wikidata place" data-wiki={properties.qid}>
      <button type="button" className="close" data-action="close-wiki" onClick={props.onClose}>Close</button>
      <h2>{properties.name}</h2>
      <p className="badge">Wikidata · {properties.confidence} confidence · published record</p>
      <p>{properties.types.slice(0, 4).join(" · ") || "Archaeological place"}</p>
      {segments.length > 0 ? (
        <div className="timeline" aria-hidden="true">
          {segments.map((segment) => (
            <i key={segment.period} style={{ left: `${segment.left}%`, width: `${segment.width}%`, background: PERIOD_COLOR[segment.period] }} />
          ))}
        </div>
      ) : (
        <p>Wikidata has no dated phase for this place.</p>
      )}
      <p className="muted">{properties.periodLabels.join(" · ") || "Undated"}{properties.startYear != null ? ` · ${format(properties.startYear)}` : ""}{properties.endYear != null ? ` – ${format(properties.endYear)}` : ""}</p>
      {properties.heritage.length > 0 ? <p>{properties.heritage.join(" · ")}</p> : null}
      <p className="source-line">
        <a href={properties.sourceUrl} target="_blank" rel="noreferrer">{properties.qid}</a>
        {properties.wikipedia ? <> · <a href={properties.wikipedia} target="_blank" rel="noreferrer">Wikipedia</a></> : null}
        {" · "}{properties.licence}
      </p>
      <p className="muted">This is a published catalogue pin, not a discovery and not a candidate from the terrain search.</p>
    </aside>
  );
}

function _percent(year: number): number {
  return ((year - AXIS[0]) / (AXIS[1] - AXIS[0])) * 100;
}

function format(year: number): string {
  return year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`;
}
