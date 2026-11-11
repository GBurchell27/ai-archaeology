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
  const [left, bottom, right, top] = bounds;
  const column = Math.round(((east - left) / (right - left)) * (width - 1));
  const row = Math.round(((top - north) / (top - bottom)) * (height - 1));
  const clampedColumn = Math.min(width - 1, Math.max(0, column));
  const clampedRow = Math.min(height - 1, Math.max(0, row));
  return metres[clampedRow * width + clampedColumn];
}
