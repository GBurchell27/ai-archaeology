/** The two sides of a landmark card: what is published about the thing, and the open questions about it. */

export type LandmarkTabId = "about" | "questions";

export const LANDMARK_TABS: readonly { id: LandmarkTabId; label: string }[] = [
  { id: "about", label: "About" },
  { id: "questions", label: "What we don't know" },
];

/** Where a key moves the selection in a row of tabs, wrapping at the ends. Null for a key that is not the tab row's. */
export function tabIndexAfterKey(key: string, currentIndex: number, tabCount: number): number | null {
  if (key === "ArrowRight") return (currentIndex + 1) % tabCount;
  if (key === "ArrowLeft") return (currentIndex - 1 + tabCount) % tabCount;
  if (key === "Home") return 0;
  if (key === "End") return tabCount - 1;
  return null;
}
