"use client";

import { OccupationBar } from "@/components/OccupationBar";
import { PlaceMaps } from "@/components/PlaceMaps";
import type { BaseMap } from "@/lib/types";
import { PERIOD_SPAN, type WikiFeature } from "@/lib/wikidata";

export function WikidataPanel(props: {
  site: WikiFeature;
  baseMap: BaseMap;
  onBase: (base: BaseMap) => void;
  contextOn: Record<string, boolean>;
  onContext: (id: string, enabled: boolean) => void;
  onClose: () => void;
}) {
  const properties = props.site.properties;
  const segments = properties.periods.flatMap((period) => {
    const span = PERIOD_SPAN[period];
    if (!span) return [];
    const [periodStart, periodEnd] = span;
    const start = properties.startYear == null ? periodStart : Math.max(properties.startYear, periodStart);
    const end = properties.endYear == null ? periodEnd : Math.min(properties.endYear, periodEnd);
    if (end < start) return [];
    return [{ id: period, start, end }];
  });
  return (
    <aside className="panel is-in wiki-panel" aria-label="Wikidata place" data-wiki={properties.qid}>
      <button type="button" className="close" data-action="close-wiki" onClick={props.onClose}>Close</button>
      <h2>{properties.name}</h2>
      <p className="badge">Wikidata · {properties.confidence} confidence · published record</p>
      <p>{properties.types.slice(0, 4).join(" · ") || "Archaeological place"}</p>
      <OccupationBar segments={segments} />
      <p className="muted">{properties.periodLabels.join(" · ") || "Undated"}{properties.startYear != null ? ` · ${format(properties.startYear)}` : ""}{properties.endYear != null ? ` – ${format(properties.endYear)}` : ""}</p>
      {properties.heritage.length > 0 ? <p>{properties.heritage.join(" · ")}</p> : null}
      <p className="source-line">
        <a href={properties.sourceUrl} target="_blank" rel="noreferrer">{properties.qid}</a>
        {properties.wikipedia ? <> · <a href={properties.wikipedia} target="_blank" rel="noreferrer">Wikipedia</a></> : null}
        {" · "}{properties.licence}
      </p>
      <PlaceMaps
        reliefOn={props.baseMap === "relief"}
        sentinelOn={props.baseMap === "satellite"}
        coronaOn={false}
        coronaAvailable={false}
        onRelief={() => props.onBase("relief")}
        onSentinel={() => props.onBase("satellite")}
        onCorona={() => undefined}
        contextOn={props.contextOn}
        onContext={props.onContext}
        note="National relief and Sentinel-2. This place has no separate close-up or CORONA frame."
      />
      <p className="muted">This is a published catalogue pin, not a discovery and not a candidate from the terrain search.</p>
    </aside>
  );
}

function format(year: number): string {
  return year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`;
}
