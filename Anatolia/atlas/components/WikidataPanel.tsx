"use client";

import { OccupationBar } from "@/components/OccupationBar";
import { PlaceMaps, closeupCreditNote } from "@/components/PlaceMaps";
import { SafeLink } from "@/components/SafeLink";
import { PERIODS } from "@/lib/periods";
import type { YearRange } from "@/lib/timeline";
import { PERIOD_SPAN, type WikiFeature } from "@/lib/wikidata";

export function WikidataPanel(props: {
  site: WikiFeature;
  detailLayer: string;
  onLayer: (layer: string) => void;
  contextOn: Record<string, boolean>;
  onContext: (id: string, enabled: boolean) => void;
  credit?: { relief: string; satellite: string } | null;
  range: YearRange;
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
      <p className="badge">{properties.source} · {properties.confidence} confidence · published record</p>
      <p>{properties.types.slice(0, 4).join(" · ") || "Archaeological place"}</p>
      <OccupationBar segments={segments} range={props.range} />
      <p className="muted">{occupationLabel(properties)}{properties.startYear != null ? ` · ${format(properties.startYear)}` : ""}{properties.endYear != null ? ` – ${format(properties.endYear)}` : ""}</p>
      {properties.heritage.length > 0 ? <p>{properties.heritage.join(" · ")}</p> : null}
      <p className="source-line">
        <SafeLink href={properties.sourceUrl}>{properties.qid}</SafeLink>
        {properties.wikipedia ? <> · <SafeLink href={properties.wikipedia}>Wikipedia</SafeLink></> : null}
        {properties.pleiadesUrl && properties.source !== "Pleiades" ? <> · <SafeLink href={properties.pleiadesUrl}>Pleiades</SafeLink></> : null}
        {" · "}{properties.licence}
        {properties.pleiadesUrl && properties.source !== "Pleiades" ? " · Pleiades CC BY 3.0 US" : ""}
      </p>
      <PlaceMaps
        reliefOn={props.detailLayer !== "satellite"}
        sentinelOn={props.detailLayer === "satellite"}
        coronaOn={false}
        coronaAvailable={false}
        onRelief={() => props.onLayer("hillshade")}
        onSentinel={() => props.onLayer("satellite")}
        onCorona={() => undefined}
        contextOn={props.contextOn}
        onContext={props.onContext}
        note={closeupCreditNote(props.credit)}
      />
      <p className="muted">This is a published catalogue pin, not a discovery and not a candidate from the terrain search.</p>
    </aside>
  );
}

function occupationLabel(properties: WikiFeature["properties"]): string {
  if (properties.periodLabels.length > 0) return properties.periodLabels.join(" · ");
  if (properties.periods.length > 0) {
    return properties.periods.map((id) => PERIODS.find((item) => item.id === id)?.label ?? id).join(" · ");
  }
  return "Undated";
}

function format(year: number): string {
  return year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`;
}
