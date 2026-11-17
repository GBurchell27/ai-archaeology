import type { KeyboardEvent } from "react";

/**
 * Arrow-key travel for a list of buttons: put it on the list's onKeyDown and mark each stop with `data-list-item`.
 * Tab still walks every item, so nothing is reachable only by arrows.
 */
export function moveFocusInList(event: KeyboardEvent<HTMLElement>): void {
  const steps: Record<string, number | undefined> = { ArrowDown: 1, ArrowUp: -1, Home: -Infinity, End: Infinity };
  const delta = steps[event.key];
  if (delta === undefined) return;
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>("[data-list-item]")];
  const at = items.indexOf(document.activeElement as HTMLElement);
  if (at < 0) return;
  event.preventDefault();
  items[Math.min(items.length - 1, Math.max(0, at + delta))].focus();
}
