import { preferredLayer } from "@/lib/rasterLayers";
import { closeupQuery, type TerrainSourceId } from "@/lib/terrainSource";
import type { BaseMap, DetailRecord, RegionalTerrain } from "@/lib/types";

const SENTINEL_LAYERS = ["terrain", "true-colour", "false-colour", "ndvi"];
const REGION_LAYER_FOR_BASE = { hypsometric: "terrain", relief: "hillshade", satellite: "true-colour" } as const;

export interface SceneRasterInput {
  activeId: string | undefined;
  activeRecord: DetailRecord | undefined;
  detail: DetailRecord | undefined;
  nearbyDetail: DetailRecord | undefined;
  detailLayer: string;
  compare: boolean;
  compareLayer: string;
  baseMap: BaseMap;
  terrainSource: TerrainSourceId;
  regional: RegionalTerrain | null;
  regionalLayer: string;
  regionalVisible: boolean;
}

export interface SceneRasters {
  detailUrl: string | null;
  compareUrl: string | null;
  regionalUrl: string | null;
  /** True when a Sentinel-derived regional raster is on screen and needs its credit. */
  regionalSentinel: boolean;
}

/** Which raster images the scene drapes for the current place, comparison and region. */
export function sceneRasters(input: SceneRasterInput): SceneRasters {
  const { activeId, activeRecord, detail, regional, compareLayer } = input;
  const currentLayer = input.nearbyDetail ? preferredLayer(input.nearbyDetail.rasters, input.baseMap) : input.detailLayer;
  const rasterPath = activeRecord?.rasters[currentLayer];
  const detailUrl = rasterPath
    ? `/terrain/${rasterPath}`
    : activeId && !activeRecord
      ? `/api/closeup?${closeupQuery(activeId, currentLayer === "satellite" ? "satellite" : "hillshade", input.terrainSource)}`
      : null;
  const compareUrl = detail?.rasters[compareLayer] ? `/terrain/${detail.rasters[compareLayer]}` : null;
  const regionLayerId = input.regionalLayer || REGION_LAYER_FOR_BASE[input.baseMap];
  const regionRaster = regional?.rasters[regionLayerId] ?? regional?.rasters.hypsometric;
  const shownLayers = [currentLayer, input.compare ? compareLayer : ""];
  const regionalSentinel = (input.regionalVisible && SENTINEL_LAYERS.includes(regionLayerId))
    || Boolean(detail && regional && shownLayers.some((layer) => SENTINEL_LAYERS.includes(layer)));
  return { detailUrl, compareUrl, regionalUrl: regionRaster ? `/terrain/${regionRaster}` : null, regionalSentinel };
}
