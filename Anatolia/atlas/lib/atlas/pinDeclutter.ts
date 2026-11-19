// Which curated pins stand at a given zoom, so the best-known ones read where pins crowd. Pure, no DOM.

export interface ScreenPoint {
  screenX: number;
  screenY: number;
}

/**
 * Points arrive best known first. One nearer than `separationPx` to a point already kept is left out,
 * so a crowd thins to its best-known members. A separation of 0 keeps every point.
 */
export function prominentPoints<Point extends ScreenPoint>(points: readonly Point[], separationPx: number): Point[] {
  if (separationPx <= 0) return [...points];
  const kept: Point[] = [];
  for (const point of points) {
    const crowded = kept.some((other) => Math.hypot(other.screenX - point.screenX, other.screenY - point.screenY) < separationPx);
    if (!crowded) kept.push(point);
  }
  return kept;
}

/** How far apart pins must stand, in pixels: `farPx` at the overview (closeness 0), easing to 0 by `allShownBy`. */
export function pinSeparationPx(closeness: number, farPx: number, allShownBy: number): number {
  return farPx * Math.max(0, 1 - closeness / allShownBy);
}
