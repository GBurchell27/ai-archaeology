import type { ClimateRecord } from "@/components/ClimateChart";
import { ReadingList } from "@/components/PlaceGuide";
import type { AtlasPreferences } from "@/components/atlas/useAtlasPreferences";
import type { ContextLayersState } from "@/components/atlas/useContextLayers";
import type { MapDisplay } from "@/components/atlas/useMapDisplay";
import type { RegionalTerrainState } from "@/components/atlas/useRegionalTerrain";
import type { TimelineState } from "@/components/atlas/useTimelineState";
import ui from "@/components/globe/chrome/chrome.module.css";
import panel from "@/components/settings/SettingsPanel.module.css";
import { LAYER_STYLE } from "@/lib/periodStyle";
import { PERIODS } from "@/lib/periods";
import { regionalMaps } from "@/lib/placeLearning";
import { RASTER_TITLES } from "@/lib/rasterLayers";
import type { BaseMap, LayerId, RegionalTerrain } from "@/lib/types";

const CONTEXT_TOGGLES: { id: string; title: string }[] = [
  { id: "rivers", title: "Present-day rivers" },
  { id: "lakes", title: "Present-day lakes" },
  { id: "paleo-water", title: "Approximate paleolakes" },
  { id: "roads", title: "Roman roads" },
  { id: "clay", title: "Soil clay" },
  { id: "soc", title: "Soil organic carbon" },
  { id: "climate", title: "Palaeoclimate records" },
];

const BASE_MAP_TITLES: Record<BaseMap, string> = { hypsometric: "Hypsometric tint", relief: "Shaded relief", satellite: "Satellite" };

const subhead = `${ui.eyebrow} ${panel.subhead}`;

/** Which places are drawn: the four period layers and the Wikidata catalogue. */
function PlaceLayerToggles({ display }: { display: MapDisplay }) {
  return (
    <>
      {(Object.keys(LAYER_STYLE) as LayerId[]).map((layer) => (
        <label className="check" key={layer}>
          <input type="checkbox" checked={display.layers[layer]} data-layer-toggle={layer} onChange={(event) => display.setLayer(layer, event.target.checked)} />
          <span className="swatch" style={{ background: LAYER_STYLE[layer].color }} /> {LAYER_STYLE[layer].title}
        </label>
      ))}
      <label className="check">
        <input type="checkbox" checked={display.wikiOn} data-layer-toggle="wikidata" onChange={(event) => display.setWikiOn(event.target.checked)} />
        Wikidata places
      </label>
    </>
  );
}

function ClimateRecordList({ records, onClimate }: { records: ClimateRecord[]; onClimate: (recordId: string) => void }) {
  return (
    <div className="climate-list">
      {records.map((record) => (
        <button type="button" key={record.id} data-climate={record.id} onClick={() => onClimate(record.id)}>
          {record.name}
        </button>
      ))}
    </div>
  );
}

/** The Layers section: place layers, then the context layers draped on the map. */
export function AtlasLayerSettings(props: { display: MapDisplay; context: ContextLayersState; onClimate: (recordId: string) => void }) {
  const { context } = props;
  return (
    <>
      <PlaceLayerToggles display={props.display} />
      <h4 className={subhead}>Context</h4>
      {CONTEXT_TOGGLES.map((layer) => (
        <label className="check" key={layer.id}>
          <input type="checkbox" checked={context.contextOn[layer.id]} data-context={layer.id} onChange={(event) => context.setContext(layer.id, event.target.checked)} />
          {layer.title}
        </label>
      ))}
      <p className="hint">
        Rivers and lakes are present-day. Paleolakes are approximate sketches.
        {context.roadsInPeriod ? " Roman roads are on for this range." : " Roman roads stay hidden until the range overlaps about 300 BCE–700 CE."}
      </p>
      <label>Soil opacity <input type="range" min={0.25} max={0.9} step={0.05} value={context.contextOpacity} data-role="context-opacity" onChange={(event) => context.setContextOpacity(Number(event.target.value))} /></label>
      {context.contextOn.climate ? <ClimateRecordList records={context.climateRecords} onClimate={props.onClimate} /> : null}
    </>
  );
}

/** The Timeline section: the four broad periods and the undated switch. The year bar stays under the map. */
export function AtlasTimelineSettings({ timeline }: { timeline: TimelineState }) {
  return (
    <>
      <div className={panel.chips} role="group" aria-label="Periods">
        {PERIODS.map((period) => (
          <button key={period.id} type="button" className={ui.chip} data-settings-period={period.id} aria-pressed={period.id === timeline.periodId} onClick={() => timeline.selectPeriod(period.id)}>
            {period.label}
          </button>
        ))}
      </div>
      <label className="check">
        <input type="checkbox" checked={timeline.showUndated} data-role="settings-undated" onChange={(event) => timeline.setShowUndated(event.target.checked)} />
        Include undated places
      </label>
      <p className={panel.note}>The year bar is under the map.</p>
    </>
  );
}

function ReliefSliders({ display }: { display: MapDisplay }) {
  return (
    <>
      <label>Exaggeration {display.exaggeration.toFixed(1)}× <input type="range" min={1} max={8} step={0.1} value={display.exaggeration} data-role="exaggeration" onChange={(event) => display.setExaggeration(Number(event.target.value))} /></label>
      <label>Sun azimuth <input type="range" min={0} max={360} value={display.azimuth} data-role="azimuth" onChange={(event) => display.setAzimuth(Number(event.target.value))} /></label>
      <label>Sun altitude <input type="range" min={8} max={80} value={display.altitude} data-role="altitude" onChange={(event) => display.setAltitude(Number(event.target.value))} /></label>
    </>
  );
}

function PlaceReliefChoice({ preferences }: { preferences: AtlasPreferences }) {
  return (
    <>
      <h4 className={subhead}>Place relief</h4>
      <label className="check">
        <input type="radio" name="terrain" checked={preferences.terrainSource === "gem15"} data-terrain="gem15" onChange={() => preferences.changeTerrainSource("gem15")} />
        <span>GEM-15 surface, 15 m</span>
      </label>
      <label className="check">
        <input type="radio" name="terrain" checked={preferences.terrainSource === "copernicus"} data-terrain="copernicus" onChange={() => preferences.changeTerrainSource("copernicus")} />
        <span>Copernicus GLO-30</span>
      </label>
    </>
  );
}

/** The Base map section: the national base map, the relief source of a place, the regional layer, relief and sun. */
export function AtlasBaseMapSettings(props: { display: MapDisplay; preferences: AtlasPreferences; regional: RegionalTerrain | null; region: RegionalTerrainState }) {
  const { display, regional, region } = props;
  return (
    <>
      {(Object.keys(BASE_MAP_TITLES) as BaseMap[]).map((base) => (
        <label className="check" key={base}>
          <input type="radio" name="base" checked={display.baseMap === base} data-base={base} onChange={() => display.setBaseMap(base)} />
          <span>{BASE_MAP_TITLES[base]}</span>
        </label>
      ))}
      <PlaceReliefChoice preferences={props.preferences} />
      {regional ? (
        <label className="regional-layer">
          Şanlıurfa layer
          <select value={region.regionalLayer} onChange={(event) => region.setRegionalLayer(event.target.value)}>
            <option value="">Follow base map</option>
            {Object.keys(regional.rasters).map((id) => (
              <option value={id} key={id}>{RASTER_TITLES[id] ?? id}</option>
            ))}
          </select>
        </label>
      ) : null}
      <ReliefSliders display={display} />
      <details className="guide-map-library">
        <summary>Historical maps and external viewers</summary>
        <ReadingList entries={regionalMaps} />
      </details>
    </>
  );
}

/** The Labels section. Curated names are always on; this adds names to catalogue dots. */
export function AtlasLabelSetting({ display }: { display: MapDisplay }) {
  return (
    <label className="check">
      <input type="checkbox" checked={display.labels} data-role="labels" onChange={(event) => display.setLabels(event.target.checked)} />
      Place names
    </label>
  );
}
