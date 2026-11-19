/**
 * Which landmark names to float over their markers while flying. Names that would cover one another are thinned:
 * the marker nearest the camera keeps its name, and the others show theirs once the view pulls them apart.
 */

/** A name as it would sit on screen: its centre in pixels, its width, and how far its marker is from the camera. */
export type NameTag = { id: string; xPx: number; yPx: number; widthPx: number; distanceM: number };

const NAME_HEIGHT_PX = 22;
const NAME_GAP_PX = 4;
const LETTER_WIDTH_PX = 7.5;
const NAME_PADDING_PX = 16;
/** A name already showing counts as this much nearer, so two names at the same distance do not swap every frame. */
const KEEP_NEARER_M = 1.5;

/** "Pillar 43, the Vulture Stone" floats as "Pillar 43". */
export const markerName = (name: string) => name.split(",")[0];

/** An estimate from the letter count: close enough to keep names apart without measuring the page. */
export const nameWidthPx = (name: string) => name.length * LETTER_WIDTH_PX + NAME_PADDING_PX;

function overlaps(one: NameTag, other: NameTag): boolean {
  const besidePx = Math.abs(one.xPx - other.xPx) - (one.widthPx + other.widthPx) / 2;
  return besidePx < NAME_GAP_PX && Math.abs(one.yPx - other.yPx) < NAME_HEIGHT_PX + NAME_GAP_PX;
}

/** The ids of the names to show, nearest first, each clear of every name kept before it. */
export function unclutteredNameIds(tags: readonly NameTag[], shownIds: ReadonlySet<string> = new Set()): string[] {
  const rankM = (tag: NameTag) => tag.distanceM - (shownIds.has(tag.id) ? KEEP_NEARER_M : 0);
  const kept: NameTag[] = [];
  for (const tag of [...tags].sort((one, other) => rankM(one) - rankM(other))) {
    if (!kept.some((keptTag) => overlaps(keptTag, tag))) kept.push(tag);
  }
  return kept.map((tag) => tag.id);
}
