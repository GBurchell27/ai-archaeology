"use client";

import type { KeyboardEvent } from "react";
import { LANDMARK_TABS, tabIndexAfterKey, type LandmarkTabId } from "@/lib/walk/landmarkTabs";
import card from "./LandmarkCard.module.css";

export const landmarkTabId = (baseId: string, tab: LandmarkTabId) => `${baseId}-tab-${tab}`;
export const landmarkPanelId = (baseId: string, tab: LandmarkTabId) => `${baseId}-panel-${tab}`;

type LandmarkTabsProps = { baseId: string; landmarkName: string; selected: LandmarkTabId; onSelect: (tab: LandmarkTabId) => void };

/** The tab row of a landmark card. One tab is in the Tab order; the arrow keys, Home and End move between them. */
export function LandmarkTabs({ baseId, landmarkName, selected, onSelect }: LandmarkTabsProps) {
  const selectedIndex = LANDMARK_TABS.findIndex((tab) => tab.id === selected);
  const moveSelection = (event: KeyboardEvent<HTMLDivElement>) => {
    const nextIndex = tabIndexAfterKey(event.key, selectedIndex, LANDMARK_TABS.length);
    if (nextIndex === null) return;
    // Stopped here so the arrows that change the tab do not also turn the walker.
    event.preventDefault();
    event.stopPropagation();
    onSelect(LANDMARK_TABS[nextIndex].id);
    event.currentTarget.querySelectorAll<HTMLElement>("[role='tab']")[nextIndex]?.focus();
  };
  return (
    <div className={card.tabs} role="tablist" aria-label={`About ${landmarkName}`} data-role="walk-landmark-tabs" data-walk-landmark-tab={selected} onKeyDown={moveSelection}>
      {LANDMARK_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          className={card.tab}
          id={landmarkTabId(baseId, tab.id)}
          aria-selected={tab.id === selected}
          aria-controls={tab.id === selected ? landmarkPanelId(baseId, tab.id) : undefined}
          tabIndex={tab.id === selected ? 0 : -1}
          data-tab={tab.id}
          onClick={() => onSelect(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
