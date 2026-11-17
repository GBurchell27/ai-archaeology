import type { BaseMap } from "@/lib/types";

export const RASTER_TITLES: Record<string, string> = {
  terrain: "Terrain and satellite",
  hillshade: "Hillshade",
  "multidirectional-hillshade": "Multi-directional hillshade",
  slope: "Slope",
  "local-relief": "Local relief",
  "sky-view-factor": "Sky-view factor",
  "true-colour": "Sentinel-2 true colour",
  "false-colour": "Sentinel-2 false colour",
  ndvi: "NDVI",
  hypsometric: "Hypsometric tint",
  satellite: "Sentinel-2 cloudless",
  corona: "CORONA, 1968–69",
};

export function preferredLayer(rasters: Record<string, string>, baseMap: BaseMap): string {
  if (baseMap !== "relief" && rasters["true-colour"]) {
    return "true-colour";
  }
  if (baseMap === "satellite" && rasters.satellite) {
    return "satellite";
  }
  if (rasters.hillshade) {
    return "hillshade";
  }
  return Object.keys(rasters)[0] ?? "hillshade";
}
