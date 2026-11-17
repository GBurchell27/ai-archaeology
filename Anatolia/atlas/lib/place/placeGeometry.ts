// Pure geometry for the close-up view. The mesh is in Web Mercator metres, which are
// longer than ground metres away from the equator (pixelSizeM / groundPixelSizeM).

const EARTH_RADIUS = 6378137;
const DEGREES = Math.PI / 180;

/** Scene units per metre of height, so `exaggeration` is true to the ground and not to the projection. */
export function verticalScale(exaggeration: number, pixelSizeM: number, groundPixelSizeM: number): number {
  return exaggeration * (pixelSizeM / groundPixelSizeM);
}

export function lonLatToMercator(longitude: number, latitude: number): [number, number] {
  const east = EARTH_RADIUS * longitude * DEGREES;
  const north = EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + (latitude * DEGREES) / 2));
  return [east, north];
}

/**
 * Camera offset from the centre of a square window so the whole window fits the view. Azimuth is a compass bearing of the camera from the centre (135 = south-east);
 * the scene has east on +x and north on -z.
 */
export function framingCameraOffset(
  spanMetres: number,
  fovDegrees: number,
  aspect: number,
  azimuthDegrees: number,
  elevationDegrees: number,
): [number, number, number] {
  const halfVertical = (fovDegrees * DEGREES) / 2;
  const halfHorizontal = Math.atan(Math.tan(halfVertical) * aspect);
  // An oblique view foreshortens the square top to bottom, but its diagonal still spans the full width.
  const distance = spanMetres * Math.max(0.62 / Math.sin(halfVertical), 0.74 / Math.sin(halfHorizontal));
  const azimuth = azimuthDegrees * DEGREES;
  const elevation = elevationDegrees * DEGREES;
  const horizontal = Math.cos(elevation) * distance;
  return [Math.sin(azimuth) * horizontal, Math.sin(elevation) * distance, -Math.cos(azimuth) * horizontal];
}

/** Ground metres covered by one screen pixel at `distance` scene units from a perspective camera. */
export function groundMetresPerPixel(
  distance: number,
  fovDegrees: number,
  viewportHeightPixels: number,
  pixelSizeM: number,
  groundPixelSizeM: number,
): number {
  const sceneUnitsPerPixel = (2 * distance * Math.tan((fovDegrees * DEGREES) / 2)) / viewportHeightPixels;
  return sceneUnitsPerPixel * (groundPixelSizeM / pixelSizeM);
}

export interface ScaleBar {
  metres: number;
  pixels: number;
  label: string;
}

/** The longest 1-2-5 length that fits in `maxPixels`. */
export function scaleBarFor(metresPerPixel: number, maxPixels: number): ScaleBar {
  const limit = metresPerPixel * maxPixels;
  const decade = 10 ** Math.floor(Math.log10(limit));
  const metres = [5, 2, 1].map((step) => step * decade).find((length) => length <= limit) ?? decade;
  const label = metres >= 1000 ? `${metres / 1000} km` : `${metres} m`;
  return { metres, pixels: metres / metresPerPixel, label };
}

/** Grid cells around the edge, clockwise from the north-west corner, as [row, column]. */
export function perimeterCells(width: number, height: number): [number, number][] {
  const cells: [number, number][] = [];
  for (let column = 0; column < width - 1; column += 1) cells.push([0, column]);
  for (let row = 0; row < height - 1; row += 1) cells.push([row, width - 1]);
  for (let column = width - 1; column > 0; column -= 1) cells.push([height - 1, column]);
  for (let row = height - 1; row > 0; row -= 1) cells.push([row, 0]);
  return cells;
}

export interface HeightGrid {
  width: number;
  height: number;
  bounds: [number, number, number, number];
  metres: Float32Array;
}

/** Elevation of the cell under a Mercator point, clamped to the window edge. */
export function gridHeightAt(grid: HeightGrid, east: number, north: number): number {
  const [left, bottom, right, top] = grid.bounds;
  const column = Math.floor(((east - left) / (right - left)) * grid.width);
  const row = Math.floor(((top - north) / (top - bottom)) * grid.height);
  const clampedColumn = Math.min(grid.width - 1, Math.max(0, column));
  const clampedRow = Math.min(grid.height - 1, Math.max(0, row));
  return grid.metres[clampedRow * grid.width + clampedColumn];
}

/** "3000–1500 BCE", "200 BCE – 400 CE", "1000–1450 CE". There is no year 0. */
export function formatYearRange(start: number | null, end: number | null): string | null {
  const era = (year: number) => (year < 0 ? "BCE" : "CE");
  const shown = (year: number) => Math.abs(year === 0 ? 1 : year);
  if (start === null && end === null) return null;
  if (start === null || end === null || start === end) {
    const year = (start ?? end) as number;
    return `${start === null ? "until " : end === null ? "from " : ""}${shown(year)} ${era(year)}`;
  }
  if (era(start) === era(end)) return `${shown(start)}–${shown(end)} ${era(end)}`;
  return `${shown(start)} ${era(start)} – ${shown(end)} ${era(end)}`;
}
