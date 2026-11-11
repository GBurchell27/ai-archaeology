const RADIUS = 6378137;

export function lonLatToMercator(longitude: number, latitude: number): [number, number] {
  const xCoord = RADIUS * (longitude * Math.PI) / 180;
  const yCoord = RADIUS * Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360));
  return [xCoord, yCoord];
}

export function toLocal(
  longitude: number,
  latitude: number,
  origin: [number, number],
): [number, number] {
  const [east, north] = lonLatToMercator(longitude, latitude);
  return [east - origin[0], -(north - origin[1])];
}

export function boundsCenter(bounds: [number, number, number, number]): [number, number] {
  return [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2];
}

export function sampleHeight(
  metres: Float32Array,
  width: number,
  height: number,
  bounds: [number, number, number, number],
  east: number,
  north: number,
): number {
  return sampleMeshHeight(metres, width, height, bounds, east, north);
}

/** Height on the same cell-centred grid the terrain mesh uses. */
export function sampleMeshHeight(
  metres: Float32Array,
  width: number,
  height: number,
  bounds: [number, number, number, number],
  east: number,
  north: number,
): number {
  const [left, bottom, right, top] = bounds;
  const column = (east - left) / ((right - left) / width) - 0.5;
  const row = (top - north) / ((top - bottom) / height) - 0.5;
  return bilinear(metres, width, height, column, row);
}

export function boundsContain(
  bounds: [number, number, number, number],
  east: number,
  north: number,
): boolean {
  const [left, bottom, right, top] = bounds;
  return east >= left && east <= right && north >= bottom && north <= top;
}

function bilinear(
  metres: Float32Array,
  width: number,
  height: number,
  column: number,
  row: number,
): number {
  const col0 = Math.min(width - 1, Math.max(0, Math.floor(column)));
  const row0 = Math.min(height - 1, Math.max(0, Math.floor(row)));
  const col1 = Math.min(width - 1, col0 + 1);
  const row1 = Math.min(height - 1, row0 + 1);
  const colMix = column <= 0 || column >= width - 1 ? 0 : column - col0;
  const rowMix = row <= 0 || row >= height - 1 ? 0 : row - row0;
  const north = lerp(metres[row0 * width + col0], metres[row0 * width + col1], colMix);
  const south = lerp(metres[row1 * width + col0], metres[row1 * width + col1], colMix);
  return lerp(north, south, rowMix);
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}
