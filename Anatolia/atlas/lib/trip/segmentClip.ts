/** An axis-aligned rectangle in scene X and Z. */
export interface Frame {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * The part of the line from `start` to `end` inside `frame`, as fractions of the line (Liang–Barsky).
 * Returns null when the line misses the frame.
 */
export function clipRange(start: [number, number], end: [number, number], frame: Frame): [number, number] | null {
  const deltaX = end[0] - start[0];
  const deltaZ = end[1] - start[1];
  const edges: [number, number][] = [
    [-deltaX, start[0] - frame.minX],
    [deltaX, frame.maxX - start[0]],
    [-deltaZ, start[1] - frame.minZ],
    [deltaZ, frame.maxZ - start[1]],
  ];
  let enter = 0;
  let leave = 1;
  for (const [direction, distance] of edges) {
    if (direction === 0) {
      if (distance < 0) return null;
      continue;
    }
    const crossing = distance / direction;
    if (direction < 0) enter = Math.max(enter, crossing);
    else leave = Math.min(leave, crossing);
    if (enter > leave) return null;
  }
  return [enter, leave];
}
