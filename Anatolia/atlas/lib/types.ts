export type LayerId = "neolithic" | "crusader";
export type Confidence = "high" | "approximate";
export type Category = "site" | "city" | "castle" | "battle" | "event";
export type BaseMap = "relief" | "hypsometric" | "satellite";

export interface SiteProperties {
  name: string;
  names: string[];
  layer: LayerId;
  category: Category;
  kind?: string;
  startYear: number;
  endYear: number;
  period: string;
  description: string;
  source: string;
  sourceUrl: string;
  confidence: Confidence;
  notes: string;
}

export interface SiteFeature {
  type: "Feature";
  id: string;
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: SiteProperties;
}

export interface SiteCollection {
  type: "FeatureCollection";
  features: SiteFeature[];
}

export interface DetailRecord {
  bounds: [number, number, number, number];
  width: number;
  height: number;
  pixelSizeM: number;
  elevation: { min: number; max: number };
  rasters: Record<string, string>;
}

export interface AtlasMetadata {
  crs: string;
  bounds: [number, number, number, number];
  width: number;
  height: number;
  pixelSizeM: number;
  elevation: { min: number; max: number };
  heightFile: string;
  rasters: Record<BaseMap, string>;
  attribution: { dem: string; satellite: string };
  honestNote: string;
  details: Record<string, DetailRecord>;
}

export interface PeriodChip {
  id: string;
  label: string;
  start: number;
  end: number;
}
