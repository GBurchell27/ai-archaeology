// Greedy placement of name labels beside screen points so they do not sit on each other.
// Pure, no imports.

export interface LabelAnchor {
  name: string;
  screenX: number;
  screenY: number;
}

export interface PlacedLabel<Anchor extends LabelAnchor> {
  anchor: Anchor;
  side: "right" | "left";
}

export interface ScreenBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const CHARACTER_PX = 7.6; // a 15px italic serif, on the generous side
const LABEL_HEIGHT_PX = 22;
const MARKER_GAP_PX = 13;
const MARKER_HALF_PX = 9;

export function labelBox(anchor: LabelAnchor, side: "right" | "left"): ScreenBox {
  const width = anchor.name.length * CHARACTER_PX + 10;
  const left = side === "right" ? anchor.screenX + MARKER_GAP_PX : anchor.screenX - MARKER_GAP_PX - width;
  return { left, right: left + width, top: anchor.screenY - LABEL_HEIGHT_PX / 2, bottom: anchor.screenY + LABEL_HEIGHT_PX / 2 };
}

const overlaps = (a: ScreenBox, b: ScreenBox) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/**
 * Anchors arrive most important first. Each takes the right of its marker, else the left,
 * else goes unlabelled; a label never covers an earlier label or its marker, nor an obstacle
 * (other chrome already on screen), nor leaves the viewport. With `minSeparationPx`, a marker
 * closer than that to an already-named one stays unnamed, so a few names spread over the view
 * instead of bunching where the monuments do.
 */
export function placeLabels<Anchor extends LabelAnchor>(
  anchors: readonly Anchor[],
  limit: number,
  viewport: { width: number; height: number },
  obstacles: readonly ScreenBox[] = [],
  minSeparationPx = 0,
): PlacedLabel<Anchor>[] {
  const taken: ScreenBox[] = [...obstacles];
  const placed: PlacedLabel<Anchor>[] = [];
  for (const anchor of anchors) {
    if (placed.length >= limit) break;
    if (placed.some((other) => Math.hypot(other.anchor.screenX - anchor.screenX, other.anchor.screenY - anchor.screenY) < minSeparationPx)) continue;
    const side = (["right", "left"] as const).find((candidate) => {
      const box = labelBox(anchor, candidate);
      return box.left >= 0 && box.right <= viewport.width && box.top >= 0 && box.bottom <= viewport.height
        && !taken.some((other) => overlaps(box, other));
    });
    if (!side) continue;
    taken.push(labelBox(anchor, side), {
      left: anchor.screenX - MARKER_HALF_PX,
      right: anchor.screenX + MARKER_HALF_PX,
      top: anchor.screenY - MARKER_HALF_PX,
      bottom: anchor.screenY + MARKER_HALF_PX,
    });
    placed.push({ anchor, side });
  }
  return placed;
}
