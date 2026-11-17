import { ReadingList } from "@/components/PlaceGuide";
import type { ClimateRecord } from "@/components/ClimateChart";
import { LAYER_STYLE } from "@/lib/periods";
import { regionalMaps } from "@/lib/placeLearning";
import { RASTER_TITLES } from "@/lib/rasterLayers";
import type { TerrainSourceId } from "@/lib/terrainSource";
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

export function SettingsMenu(props: {
  baseMap: BaseMap;
  regional: RegionalTerrain | null;
  regionalLayer: string;
  onRegionalLayer: (layer: string) => void;
  layers: Record<LayerId, boolean>;
  exaggeration: number;
  azimuth: number;
  altitude: number;
  labels: boolean;
  onBase: (base: BaseMap) => void;
  onLayer: (layer: LayerId, enabled: boolean) => void;
  onExaggeration: (value: number) => void;
  onAzimuth: (value: number) => void;
  onAltitude: (value: number) => void;
  onLabels: (value: boolean) => void;
  terrainSource: TerrainSourceId;
  onTerrain: (source: TerrainSourceId) => void;
  wikiOn: boolean;
  onWiki: (enabled: boolean) => void;
  contextOn: Record<string, boolean>;
  contextOpacity: number;
  roadsInPeriod: boolean;
  climateRecords: ClimateRecord[];
  onContext: (id: string, enabled: boolean) => void;
  onContextOpacity: (value: number) => void;
  onClimate: (recordId: string) => void;
}) {
  return (
    <aside className="menu" aria-label="Settings">
      <h2>Map</h2>
      {(["hypsometric", "relief", "satellite"] as BaseMap[]).map((base) => (
        <label className="check" key={base}>
          <input type="radio" name="base" checked={props.baseMap === base} data-base={base} onChange={() => props.onBase(base)} />
          <span>{base === "relief" ? "Shaded relief" : base === "hypsometric" ? "Hypsometric tint" : "Satellite"}</span>
        </label>
      ))}
      <h2>Place relief</h2>
      <label className="check">
        <input type="radio" name="terrain" checked={props.terrainSource === "gem15"} data-terrain="gem15" onChange={() => props.onTerrain("gem15")} />
        <span>GEM-15 surface, 15 m</span>
      </label>
      <label className="check">
        <input type="radio" name="terrain" checked={props.terrainSource === "copernicus"} data-terrain="copernicus" onChange={() => props.onTerrain("copernicus")} />
        <span>Copernicus GLO-30</span>
      </label>
      {props.regional ? (
        <label className="regional-layer">
          Şanlıurfa layer
          <select value={props.regionalLayer} onChange={(event) => props.onRegionalLayer(event.target.value)}>
            <option value="">Follow base map</option>
            {Object.keys(props.regional.rasters).map((id) => (
              <option value={id} key={id}>{RASTER_TITLES[id] ?? id}</option>
            ))}
          </select>
        </label>
      ) : null}
      <h2>Places</h2>
      {(Object.keys(LAYER_STYLE) as LayerId[]).map((layer) => (
        <label className="check" key={layer}>
          <input type="checkbox" checked={props.layers[layer]} data-layer-toggle={layer} onChange={(event) => props.onLayer(layer, event.target.checked)} />
          <span className="swatch" style={{ background: LAYER_STYLE[layer].color }} /> {LAYER_STYLE[layer].title}
        </label>
      ))}
      <label>Exaggeration {props.exaggeration.toFixed(1)}× <input type="range" min={1} max={8} step={0.1} value={props.exaggeration} data-role="exaggeration" onChange={(event) => props.onExaggeration(Number(event.target.value))} /></label>
      <label>Sun azimuth <input type="range" min={0} max={360} value={props.azimuth} data-role="azimuth" onChange={(event) => props.onAzimuth(Number(event.target.value))} /></label>
      <label>Sun altitude <input type="range" min={8} max={80} value={props.altitude} data-role="altitude" onChange={(event) => props.onAltitude(Number(event.target.value))} /></label>
      <label className="check">
        <input type="checkbox" checked={props.labels} data-role="labels" onChange={(event) => props.onLabels(event.target.checked)} />
        Place names
      </label>
      <label className="check">
        <input type="checkbox" checked={props.wikiOn} data-layer-toggle="wikidata" onChange={(event) => props.onWiki(event.target.checked)} />
        Wikidata places
      </label>
      <h2>Context</h2>
      {CONTEXT_TOGGLES.map((layer) => (
        <label className="check" key={layer.id}>
          <input
            type="checkbox"
            checked={props.contextOn[layer.id]}
            data-context={layer.id}
            onChange={(event) => props.onContext(layer.id, event.target.checked)}
          />
          {layer.title}
        </label>
      ))}
      <p className="hint">
        Rivers and lakes are present-day. Paleolakes are approximate sketches.
        {props.roadsInPeriod ? " Roman roads are on for this range." : " Roman roads stay hidden until the range overlaps about 300 BCE–700 CE."}
      </p>
      <label>Soil opacity <input type="range" min={0.25} max={0.9} step={0.05} value={props.contextOpacity} data-role="context-opacity" onChange={(event) => props.onContextOpacity(Number(event.target.value))} /></label>
      {props.contextOn.climate ? (
        <div className="climate-list">
          {props.climateRecords.map((record) => (
            <button type="button" key={record.id} data-climate={record.id} onClick={() => props.onClimate(record.id)}>
              {record.name}
            </button>
          ))}
        </div>
      ) : null}
      <details className="guide-map-library">
        <summary>Historical maps and external viewers</summary>
        <ReadingList entries={regionalMaps} />
      </details>
    </aside>
  );
}
