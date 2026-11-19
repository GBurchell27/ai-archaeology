// Greedy placement of name labels beside screen points so they do not sit on each other.
// Pure, no imports.

export interface LabelAnchor {
  name: string;
  screenX: number;
  screenY: number;
  /** Pixels from the marker's centre to its name, when the marker is larger than usual (a selection ring). */
  markerGapPx?: number;
}

export type LabelSide = "right" | "left" | "above" | "below";

export interface PlacedLabel<Anchor extends LabelAnchor> {
  anchor: Anchor;
  side: LabelSide;
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

/** Beside the marker only, as the globe names its monuments. */
export const BESIDE_MARKER: readonly LabelSide[] = ["right", "left"];
/** Beside the marker first, then centred over it or under it. */
export const AROUND_MARKER: readonly LabelSide[] = ["right", "left", "above", "below"];

export function labelBox(anchor: LabelAnchor, side: LabelSide): ScreenBox {
  const width = anchor.name.length * CHARACTER_PX + 10;
  const gap = anchor.markerGapPx ?? MARKER_GAP_PX;
  if (side === "above" || side === "below") {
    const top = side === "below" ? anchor.screenY + gap : anchor.screenY - gap - LABEL_HEIGHT_PX;
    return { left: anchor.screenX - width / 2, right: anchor.screenX + width / 2, top, bottom: top + LABEL_HEIGHT_PX };
  }
  const left = side === "right" ? anchor.screenX + gap : anchor.screenX - gap - width;
  return { left, right: left + width, top: anchor.screenY - LABEL_HEIGHT_PX / 2, bottom: anchor.screenY + LABEL_HEIGHT_PX / 2 };
}

const overlaps = (a: ScreenBox, b: ScreenBox) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/**
 * Anchors arrive most important first. Each takes the first of `sides` that is free (the right of
 * its marker, else the left, unless told otherwise), else goes unlabelled; a label never covers an earlier label or its marker, nor an obstacle
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
  sides: readonly LabelSide[] = BESIDE_MARKER,
): PlacedLabel<Anchor>[] {
  const taken: ScreenBox[] = [...obstacles];
  const placed: PlacedLabel<Anchor>[] = [];
  for (const anchor of anchors) {
    if (placed.length >= limit) break;
    if (placed.some((other) => Math.hypot(other.anchor.screenX - anchor.screenX, other.anchor.screenY - anchor.screenY) < minSeparationPx)) continue;
    const side = sides.find((candidate) => {
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
