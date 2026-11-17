// Streamed globe imagery. Every source here has a licence row in docs/data-sources.md.

export interface GlobeBasemap {
  id: string;
  title: string;
  /** Web-Mercator XYZ template ({z}/{y}/{x} order is the WMTS REST layout both hosts use). */
  urlTemplate: string;
  maxLevel: number;
  licence: string;
  attribution: string;
  attributionUrl: string;
}

export const GLOBE_BASEMAPS: GlobeBasemap[] = [
  {
    id: "s2cloudless-2020",
    title: "Sentinel-2 cloudless 2020",
    urlTemplate: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg",
    // The globe hands off to terrain long before level 12 runs out; this also keeps load on a free service low.
    maxLevel: 12,
    licence: "CC BY-NC-SA 4.0",
    attribution: "Sentinel-2 cloudless – https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2020)",
    attributionUrl: "https://s2maps.eu",
  },
  {
    id: "gibs-blue-marble",
    title: "NASA Blue Marble",
    urlTemplate: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg",
    maxLevel: 8,
    licence: "No restriction",
    attribution: "NASA Global Imagery Browse Services (GIBS), part of EOSDIS",
    attributionUrl: "https://earthdata.nasa.gov/gibs",
  },
];

export const DEFAULT_GLOBE_BASEMAP = GLOBE_BASEMAPS[0];
export const FALLBACK_GLOBE_BASEMAP = GLOBE_BASEMAPS[1];

export function basemapTileUrl(basemap: GlobeBasemap, level: number, x: number, y: number): string {
  return basemap.urlTemplate.replace("{z}", String(level)).replace("{x}", String(x)).replace("{y}", String(y));
}
