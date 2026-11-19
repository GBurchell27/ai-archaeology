"use client";

import { useTheme } from "@/components/AtlasChrome";

/** Applies the visitor's saved light or dark theme to a page that has no chrome of its own. Renders nothing. */
export function ThemeFromPreference() {
  useTheme();
  return null;
}
