import { OccupationBar } from "@/components/OccupationBar";
import { PlaceGuide } from "@/components/PlaceGuide";
import { PlaceMaps, closeupCreditNote } from "@/components/PlaceMaps";
import { PlaceResources } from "@/components/PlaceResources";
import { SafeLink } from "@/components/SafeLink";
import { formatYear } from "@/lib/periods";
import { RASTER_TITLES } from "@/lib/rasterLayers";
import type { YearRange } from "@/lib/timeline";
import type { BaseMap, CoronaRecord, SiteFeature, SiteProperties } from "@/lib/types";
import { PERIOD_SPAN } from "@/lib/wikidata";

function occupationSegments(properties: SiteProperties): { id: string; start: number; end: number }[] {
  if (properties.periods && properties.periods.length > 0) {
    return properties.periods.flatMap((period) => {
      const span = PERIOD_SPAN[period];
      if (!span) return [];
      const [periodStart, periodEnd] = span;
      const start = Math.max(properties.startYear, periodStart);
      const end = Math.min(properties.endYear, periodEnd);
      if (end < start) return [];
      return [{ id: period, start, end }];
    });
  }
  return [{ id: properties.layer, start: properties.startYear, end: properties.endYear }];
}

export function SitePanel(props: {
  site: SiteFeature;
  related: { id: string; name: string }[];
  onVisit: (id: string) => void;
  /** Present only for a site that has a walk view. */
  onWalk?: () => void;
  rasters: [string, string][];
  detailLayer: string;
  compare: boolean;
  compareLayer: string;
  split: number;
  opacity: number;
  shown: boolean;
  onClose: () => void;
  onLayer: (layer: string) => void;
  onCompare: (enabled: boolean) => void;
  onCompareLayer: (layer: string) => void;
  onSplit: (value: number) => void;
  onOpacity: (value: number) => void;
  corona?: CoronaRecord;
  baseMap: BaseMap;
  onBase: (base: BaseMap) => void;
  contextOn: Record<string, boolean>;
  onContext: (id: string, enabled: boolean) => void;
  closeup?: boolean;
  credit?: { relief: string; satellite: string } | null;
  reliefNote?: string;
  reliefError?: string | null;
  range: YearRange;
}) {
  const properties = props.site.properties;
  const ids = new Set(props.rasters.map(([id]) => id));
  const reliefId = ids.has("hillshade") ? "hillshade" : ids.has("hypsometric") ? "hypsometric" : null;
  const sentinelId = ids.has("true-colour") ? "true-colour" : ids.has("satellite") ? "satellite" : null;
  const coronaId = ids.has("corona") ? "corona" : null;
  const local = reliefId != null || sentinelId != null || coronaId != null;
  const reliefChoice = reliefId ?? (props.closeup ? "hillshade" : null);
  const sentinelChoice = sentinelId ?? (props.closeup ? "satellite" : null);
  return (
    <PlaceGuide
      id={props.site.id}
      name={properties.name}
      label="Selected place"
      shown={props.shown}
      closeAction="close-panel"
      onClose={props.onClose}
      related={props.related}
      onVisit={props.onVisit}
      meta={<>
        <p className="guide-meta">{properties.period} · {properties.confidence === "approximate" ? "Approximate location" : "Published location"}</p>
        {props.reliefError ? <p data-role="relief-error">{props.reliefError}</p> : null}
        {props.onWalk ? (
          <button type="button" className="guide-text-button" data-action="walk-site" onClick={props.onWalk}>Walk the site <span aria-hidden="true">→</span></button>
        ) : null}
      </>}
      overview={<>
        {properties.names.length > 1 ? <p className="muted">{properties.names.join(" · ")}</p> : null}
        <p>{formatYear(properties.startYear)} – {formatYear(properties.endYear)}</p>
        <OccupationBar segments={occupationSegments(properties)} range={props.range} />
        <p>{properties.description}</p>
        {properties.notes ? <p>{properties.notes}</p> : null}
      </>}
      sources={<>
        <p className="source-line">
          Catalogue citation · <SafeLink href={properties.sourceUrl}>{properties.source}</SafeLink>
          {properties.pleiadesUrl ? <> · <SafeLink href={properties.pleiadesUrl}>Pleiades</SafeLink> CC BY 3.0 US</> : null}
        </p>
        <PlaceResources id={props.site.id} longitude={props.site.geometry.coordinates[0]} latitude={props.site.geometry.coordinates[1]} />
      </>}
      maps={<>
      <PlaceMaps
        reliefOn={reliefChoice ? props.detailLayer === reliefChoice : props.baseMap === "relief"}
        sentinelOn={sentinelChoice ? props.detailLayer === sentinelChoice : props.baseMap === "satellite"}
        coronaOn={coronaId != null && props.detailLayer === coronaId}
        coronaAvailable={coronaId != null}
        onRelief={() => (reliefChoice ? props.onLayer(reliefChoice) : props.onBase("relief"))}
        onSentinel={() => (sentinelChoice ? props.onLayer(sentinelChoice) : props.onBase("satellite"))}
        onCorona={() => {
          if (coronaId) props.onLayer(coronaId);
        }}
        contextOn={props.contextOn}
        onContext={props.onContext}
        note={props.closeup ? closeupCreditNote(props.credit) : props.reliefNote}
      />
      {props.rasters.length > 0 ? (
        <section className="place-layers">
          <h2>This place</h2>
          <div className="layer-pills">
          {props.rasters.map(([id]) => (
            <label className="check" key={id}>
              <input type="radio" name="detail" checked={props.detailLayer === id} data-detail-layer={id} onChange={() => props.onLayer(id)} />
              {RASTER_TITLES[id] ?? id}
            </label>
          ))}
          </div>
          <label>Opacity <input type="range" min={0.2} max={1} step={0.05} value={props.opacity} data-role="opacity" onChange={(event) => props.onOpacity(Number(event.target.value))} /></label>
          <label className="check">
            <input type="checkbox" checked={props.compare} data-role="compare" onChange={(event) => props.onCompare(event.target.checked)} />
            Compare
          </label>
          <select value={props.compareLayer} data-role="compare-layer" onChange={(event) => props.onCompareLayer(event.target.value)}>
            {props.rasters.map(([id]) => <option key={id} value={id}>{RASTER_TITLES[id] ?? id}</option>)}
          </select>
          <label>Swipe <input type="range" min={0} max={100} value={props.split * 100} data-role="swipe" onChange={(event) => props.onSplit(Number(event.target.value) / 100)} /></label>
          {props.corona && (props.detailLayer === "corona" || (props.compare && props.compareLayer === "corona")) ? (
            <p className="source-line" data-role="corona-credit">
              {props.corona.credit}. Frame {props.corona.frame} ({props.corona.date}), about {props.corona.pixelSizeM.toFixed(1)} m.
              {" "}{props.corona.licence}. {props.corona.note}{" "}
              <SafeLink href={props.corona.sourceUrl}>CORONA Atlas</SafeLink>
            </p>
          ) : null}
        </section>
      ) : null}
      </>}
    />
  );
}
