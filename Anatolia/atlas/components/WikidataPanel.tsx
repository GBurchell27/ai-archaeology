"use client";

import { OccupationBar } from "@/components/OccupationBar";
import { PlaceGuide } from "@/components/PlaceGuide";
import { PlaceMaps, closeupCreditNote } from "@/components/PlaceMaps";
import { PlaceResources } from "@/components/PlaceResources";
import { SafeLink } from "@/components/SafeLink";
import { PERIODS } from "@/lib/periods";
import type { YearRange } from "@/lib/timeline";
import { PERIOD_SPAN, type WikiFeature } from "@/lib/wikidata";

export function WikidataPanel(props: {
  site: WikiFeature;
  related: { id: string; name: string }[];
  onVisit: (id: string) => void;
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
    <PlaceGuide
      id={props.site.id}
      qid={properties.qid}
      name={properties.name}
      label="Catalogue place"
      closeAction="close-wiki"
      onClose={props.onClose}
      related={props.related}
      onVisit={props.onVisit}
      meta={<p className="guide-meta">{properties.source} · {properties.confidence} confidence · published record</p>}
      overview={<>
        <p>{properties.types.slice(0, 4).join(" · ") || "Archaeological place"}</p>
        <OccupationBar segments={segments} range={props.range} />
        <p>{occupationLabel(properties)}{properties.startYear != null ? ` · ${format(properties.startYear)}` : ""}{properties.endYear != null ? ` – ${format(properties.endYear)}` : ""}</p>
        {properties.heritage.length > 0 ? <p>{properties.heritage.join(" · ")}</p> : null}
      </>}
      sources={<>
        <p className="source-line">
          Catalogue citation · <SafeLink href={properties.sourceUrl}>{properties.qid}</SafeLink>
          {properties.wikipedia ? <> · <SafeLink href={properties.wikipedia}>Wikipedia</SafeLink></> : null}
          {properties.pleiadesUrl && properties.source !== "Pleiades" ? <> · <SafeLink href={properties.pleiadesUrl}>Pleiades</SafeLink></> : null}
          {" · "}{properties.licence}
          {properties.pleiadesUrl && properties.source !== "Pleiades" ? " · Pleiades CC BY 3.0 US" : ""}
        </p>
        <PlaceResources id={props.site.id} longitude={props.site.geometry.coordinates[0]} latitude={props.site.geometry.coordinates[1]} />
      </>}
      maps={
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
      }
    />
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
