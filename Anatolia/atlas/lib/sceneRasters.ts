import { preferredLayer } from "@/lib/rasterLayers";
import { closeupQuery, type TerrainSourceId } from "@/lib/terrainSource";
import type { BaseMap, DetailRecord, RegionalTerrain } from "@/lib/types";

const SENTINEL_LAYERS = ["terrain", "true-colour", "false-colour", "ndvi"];
const REGION_LAYER_FOR_BASE = { hypsometric: "terrain", relief: "hillshade", satellite: "true-colour" } as const;
/**
 * The regional "terrain" raster is the elevation tint blended with satellite imagery, so it is greyer and darker
 * than the national tint around it. These red, green and blue gains bring its average back to that tint
 * (measured on the two images over the same ground), so the block does not read as a rectangle.
 */
const REGION_BLEND_GAIN: ColourGain = [1.17, 1.12, 0.95];
/**
 * A site window's Sentinel true-colour image is a contrast stretch of pale limestone: blue-grey, with shadows
 * and basalt close to black. On the tinted base map it takes warm gains (about half way to the regional tint,
 * measured over the six windows inside the region) and a little sand, which lifts the blacks off the edge.
 */
const SITE_IMAGERY_GRADE: ImageryGrade = { gain: [1.32, 1.2, 0.98], wash: 0.1 };

export type ColourGain = readonly [number, number, number];

export interface ImageryGrade {
  gain: ColourGain;
  /** The share of plain sand mixed into the image, 0 to 1. */
  wash: number;
}

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
  /** Gains that match the regional raster to the national map around it; null when they already match. */
  regionalGain: ColourGain | null;
  /** The grade that sets the selected place's image into the map around it; null when it is shown as it is. */
  detailGrade: ImageryGrade | null;
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
  const regionalGain = regionLayerId === "terrain" && input.baseMap === "hypsometric" ? REGION_BLEND_GAIN : null;
  // A swipe comparison shows both images as they are.
  const detailGrade = currentLayer === "true-colour" && input.baseMap === "hypsometric" && !input.compare ? SITE_IMAGERY_GRADE : null;
  const regionalUrl = regionRaster ? `/terrain/${regionRaster}` : null;
  return { detailUrl, compareUrl, regionalUrl, regionalSentinel, regionalGain, detailGrade };
}
