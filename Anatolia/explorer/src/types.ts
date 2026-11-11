export type LayerKind = "procedural" | "raster" | "placeholder";
export type SiteKind = "validation" | "published" | "submerged" | "landmark";

export interface LayerInfo {
  id: string;
  title: string;
  kind: LayerKind;
  description: string;
}

export interface ElevationRange {
  min: number;
  max: number;
}

export interface RegionRecord {
  bounds: [number, number, number, number];
  width: number;
  height: number;
  pixelSizeM: number;
  elevation: ElevationRange;
  rasters: Record<string, string>;
}

export interface SiteRecord {
  id: string;
  utm: [number, number];
  groundElevation: number;
  bounds: [number, number, number, number];
  width: number;
  height: number;
  pixelSizeM: number;
  neighbourhoodM: number;
  elevation: ElevationRange;
  rasters: Record<string, string>;
}

export interface TerrainMetadata {
  generated: string;
  crs: string;
  honestNote: string;
  attribution: { dem: string; sentinel: string };
  sentinel: { day: string; year: number; sceneIds: string[] };
  catalog: LayerInfo[];
  region: RegionRecord;
  sites: SiteRecord[];
}

export interface SiteProperties {
  name: string;
  period: string;
  kind: SiteKind;
  description: string;
  source: string;
  sourceUrl: string;
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

export interface PlacedSite {
  feature: SiteFeature;
  record: SiteRecord;
}

export interface ViewSettings {
  selectedId: string | null;
  layerId: string;
  opacity: number;
  compare: boolean;
  compareLayerId: string;
  split: number;
  exaggeration: number;
  azimuth: number;
  altitude: number;
  labels: boolean;
}
