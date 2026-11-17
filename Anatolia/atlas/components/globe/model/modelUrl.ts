// `&model=<layerId>` on a globe address: the recording-pattern layer that is switched on.
// WorldCoordinator rewrites the whole query on every camera move, so the active id is held here
// (one address bar, one value) and re-attached to each globe address it writes.

import { isPredictLayerId } from "@/lib/world/predictIndex";

const PARAMETER = "model";
let activeLayerId: string | null = null;

export function readModelParam(): string | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get(PARAMETER);
  return value && isPredictLayerId(value) ? value : null;
}

/** A globe address with the active layer attached; other views pass through untouched. */
export function withModelParam(search: string): string {
  return activeLayerId && search.startsWith("?view=globe") ? `${search}&${PARAMETER}=${activeLayerId}` : search;
}

/** Records which layer is on (null = off) and patches the address in place when the globe is showing. */
export function writeModelParam(layerId: string | null): void {
  activeLayerId = layerId;
  const parameters = new URLSearchParams(window.location.search);
  if ((parameters.get("view") ?? "globe") !== "globe") return;
  if (layerId) parameters.set(PARAMETER, layerId);
  else parameters.delete(PARAMETER);
  const query = parameters.toString();
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
}
