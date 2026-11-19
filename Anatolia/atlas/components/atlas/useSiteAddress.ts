import { useEffect, useRef } from "react";

/**
 * Reports the id of the selected place, or null when none is, so the coordinator can name it in the address.
 * Nothing is reported before the place the atlas was opened on has been decided (`initialSettled`):
 * until then the address still names what was asked for, and a reload asks for it again.
 */
export function useSiteAddress(selectedId: string | null, initialSettled: boolean, onSelectSite: ((siteId: string | null) => void) | undefined): void {
  const report = useRef(onSelectSite);
  report.current = onSelectSite;
  useEffect(() => {
    if (initialSettled) report.current?.(selectedId);
  }, [selectedId, initialSettled]);
}
