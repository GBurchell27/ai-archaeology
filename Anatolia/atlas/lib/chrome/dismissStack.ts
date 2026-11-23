/**
 * The open layers that Escape can dismiss, frontmost first.
 * A higher priority is in front. The same priority keeps the one opened latest.
 */

export const DISMISS_PRIORITY = {
  /** Legend, key, period dock, and the phone sheets for the year range. */
  chrome: 40,
  /** Side panels, place cards, charts, the trip bar. */
  panel: 60,
  /** A search-results list, which sits over a panel. */
  search: 70,
  /** The shortcut list, which sits over everything else on the Anatolia map. */
  help: 80,
} as const;

export interface DismissLayer {
  id: number;
  priority: number;
  close: () => void;
}

let nextId = 1;
const layers: DismissLayer[] = [];
let listening = false;

export function pushDismissLayer(priority: number, close: () => void): () => void {
  const layer: DismissLayer = { id: nextId++, priority, close };
  layers.push(layer);
  ensureDismissListener();
  return () => {
    const index = layers.findIndex((item) => item.id === layer.id);
    if (index >= 0) layers.splice(index, 1);
  };
}

/** The layer Escape should close, or none when nothing is open. */
export function topDismissLayer(): DismissLayer | undefined {
  return layers.reduce<DismissLayer | undefined>((best, layer) => {
    if (!best || layer.priority > best.priority || (layer.priority === best.priority && layer.id > best.id)) return layer;
    return best;
  }, undefined);
}

/** Closes that layer. Returns false when the stack is empty. */
export function closeTopDismissLayer(): boolean {
  const top = topDismissLayer();
  if (!top) return false;
  top.close();
  return true;
}

export function dismissLayerCount(): number {
  return layers.length;
}

/** Puts the stack back to empty. The checks use it between cases. */
export function resetDismissStack(): void {
  layers.splice(0, layers.length);
  nextId = 1;
}

function onEscape(event: KeyboardEvent): void {
  if (event.key !== "Escape" || event.defaultPrevented) return;
  if (!closeTopDismissLayer()) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}

function ensureDismissListener(): void {
  if (listening || typeof window === "undefined") return;
  listening = true;
  // Added as this module loads, which is during render and so ahead of the view's own Escape handler.
  window.addEventListener("keydown", onEscape);
}

if (typeof window !== "undefined") ensureDismissListener();
