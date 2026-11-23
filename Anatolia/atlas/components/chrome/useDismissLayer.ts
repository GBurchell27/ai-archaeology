"use client";

import { useEffect, useRef, useState } from "react";
import { pushDismissLayer } from "@/lib/chrome/dismissStack";

/** While `open`, Escape closes this layer when it is the frontmost one. */
export function useDismissLayer(open: boolean, close: () => void, priority: number): void {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    return pushDismissLayer(priority, () => closeRef.current());
  }, [open, priority]);
}

const PHONE_SHEET = "(max-width: 640px)";

/** The phone year sheets are not closable layers on a wide screen, where the bar is always shown. */
export function usePhoneSheetDismiss(open: boolean, close: () => void, priority: number): void {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(PHONE_SHEET);
    const apply = () => setPhone(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  useDismissLayer(open && phone, close, priority);
}
