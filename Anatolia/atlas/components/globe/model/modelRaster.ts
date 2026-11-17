// How a place on Earth maps onto a layer raster, and when the layer is too coarse to show.
// Raster (Contract 4): 1440×720 equirectangular, row 0 = 90°N, column 0 = 180°W, 0.25° cells.
// The shader in modelOverlayMaterial.ts repeats rasterUv in GLSL; keep the two in step.

export const RASTER_COLUMNS = 1440;
export const RASTER_ROWS = 720;
const CELL_METRES_AT_EQUATOR = 27_830;

/**
 * Texture coordinates of a lon/lat for a texture uploaded with three's default flipY:
 * u runs east from 180°W, v runs north from the south pole (so v = 1 is raster row 0).
 */
export function rasterUv(longitude: number, latitude: number): [u: number, v: number] {
  return [(longitude + 180) / 360, (latitude + 90) / 180];
}

/** The raster cell a lon/lat falls in, as the file stores it (row 0 at the north pole). */
export function rasterCell(longitude: number, latitude: number): { column: number; row: number } {
  const [u, v] = rasterUv(longitude, latitude);
  return {
    column: Math.min(RASTER_COLUMNS - 1, Math.floor(u * RASTER_COLUMNS)),
    row: Math.min(RASTER_ROWS - 1, Math.floor((1 - v) * RASTER_ROWS)),
  };
}

/** A cell wider than this share of the view height would pass for detail the layer does not have. */
const HIDDEN_CELL_SHARE = 1 / 8;
const FULL_CELL_SHARE = 1 / 16;

/** Camera altitude (metres) at which one cell spans the given share of the view height. */
function altitudeForCellShare(share: number, fieldOfViewDegrees: number): number {
  return CELL_METRES_AT_EQUATOR / (share * 2 * Math.tan((fieldOfViewDegrees * Math.PI) / 360));
}

/** 1 from orbit, falling to 0 as the camera comes low enough for single cells to fill the view. */
export function coarseLayerFade(altitude: number, fieldOfViewDegrees: number): number {
  const hidden = altitudeForCellShare(HIDDEN_CELL_SHARE, fieldOfViewDegrees);
  const full = altitudeForCellShare(FULL_CELL_SHARE, fieldOfViewDegrees);
  const fraction = Math.min(1, Math.max(0, (altitude - hidden) / (full - hidden)));
  return fraction * fraction * (3 - 2 * fraction);
}
