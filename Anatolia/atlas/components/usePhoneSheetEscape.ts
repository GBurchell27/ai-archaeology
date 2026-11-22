import { useEffect, useRef } from "react";

/**
 * Escape closes a phone sheet (the globe timeline, the Anatolia year bar) before a panel.
 * Registered while the control is mounted, so it runs ahead of the view's own Escape handler.
 * A sheet hidden under an open place card does not take the key: `covered` says so.
 */
export function usePhoneSheetEscape(open: boolean, close: () => void, covered: () => boolean): void {
  const latest = useRef({ open, close, covered });
  latest.current = { open, close, covered };
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const current = latest.current;
      if (event.key !== "Escape" || event.defaultPrevented || !current.open) return;
      if (!window.matchMedia("(max-width: 640px)").matches || current.covered()) return;
      current.close();
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

export function globeTimeSheetCovered(): boolean {
  return document.querySelector("[data-role='globe-explorer']")?.getAttribute("data-side") === "open";
}

export function atlasYearSheetCovered(): boolean {
  return document.body.dataset.panel === "open";
}
