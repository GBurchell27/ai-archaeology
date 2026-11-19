// Presets of the settings panel. A preset only sets filter and timeline state a view already has; it stores nothing.

import { RANGE_END, RANGE_START, type YearRange } from "@/lib/timeline";
import { ALL_TIME, WORLD_ERAS, WORLD_RANGE_START, type YearSpan } from "@/lib/world/worldEras";

export type SettingsPresetId = "everything" | "deep-past" | "megaliths-only";

export interface SettingsPreset {
  id: SettingsPresetId;
  label: string;
  /** Shown in a view that cannot apply the preset. */
  elsewhere: string;
}

export const SETTINGS_PRESETS: readonly SettingsPreset[] = [
  { id: "everything", label: "Everything", elsewhere: "“Everything” applies on the globe and on the Anatolia map." },
  { id: "deep-past", label: "Deep past", elsewhere: "“Deep past” applies on the globe and on the Anatolia map." },
  { id: "megaliths-only", label: "Megaliths only", elsewhere: "“Megaliths only” applies on the globe, which has the site type filter." },
];

/** Shown in a view that can apply none of them. */
export const PRESETS_ELSEWHERE = "Presets apply on the globe and on the Anatolia map.";

/** The globe state a preset sets, and the state it is recognised by. */
export interface GlobePresetState {
  summary: string;
  yearSpan: YearSpan;
  showUndated: boolean;
  featuredOnly: boolean;
  /** The only site types left showing; null for every type. */
  onlyTypes: readonly string[] | null;
  osmMegaliths: boolean;
}

/** The end of the globe's second date band (9000–5000 BCE): the deep past is the first two bands. */
export const GLOBE_DEEP_PAST_END = WORLD_ERAS[1].span[1];

export const GLOBE_PRESETS: Record<SettingsPresetId, GlobePresetState> = {
  everything: {
    summary: "All time, every site type, undated sites included. The starting state.",
    yearSpan: ALL_TIME, showUndated: true, featuredOnly: false, onlyTypes: null, osmMegaliths: false,
  },
  "deep-past": {
    summary: "Sites dated before 5000 BCE, the first two date bands, which hold the Younger Dryas. Undated sites are left out.",
    yearSpan: [WORLD_RANGE_START, GLOBE_DEEP_PAST_END], showUndated: false, featuredOnly: false, onlyTypes: null, osmMegaliths: false,
  },
  "megaliths-only": {
    summary: "The megalith site type alone, at all dates, with the OpenStreetMap megalith layer on.",
    yearSpan: ALL_TIME, showUndated: true, featuredOnly: false, onlyTypes: ["megalith"], osmMegaliths: true,
  },
};

/** The site types a preset hides, out of the catalogue's list. */
export function hiddenTypesFor(onlyTypes: readonly string[] | null, siteTypes: readonly string[]): string[] {
  return onlyTypes ? siteTypes.filter((siteType) => !onlyTypes.includes(siteType)) : [];
}

export interface GlobeFilterState {
  yearSpan: YearSpan;
  showUndated: boolean;
  featuredOnly: boolean;
  hiddenTypes: ReadonlySet<string>;
  osmMegaliths: boolean;
}

/** The preset the globe's state matches exactly, or null once the visitor has changed anything. */
export function activeGlobePreset(state: GlobeFilterState, siteTypes: readonly string[]): SettingsPresetId | null {
  const match = SETTINGS_PRESETS.find(({ id }) => {
    const preset = GLOBE_PRESETS[id];
    const hidden = hiddenTypesFor(preset.onlyTypes, siteTypes);
    return preset.yearSpan[0] === state.yearSpan[0] && preset.yearSpan[1] === state.yearSpan[1]
      && preset.showUndated === state.showUndated && preset.featuredOnly === state.featuredOnly
      && preset.osmMegaliths === state.osmMegaliths
      && hidden.length === state.hiddenTypes.size && hidden.every((siteType) => state.hiddenTypes.has(siteType));
  });
  return match?.id ?? null;
}

/** The Anatolia map's timeline state a preset sets. It has no site type filter, so "Megaliths only" has no entry. */
export interface AtlasPresetState {
  summary: string;
  range: YearRange;
  showUndated: boolean;
  /** Also switch every place layer back on. */
  everyLayer: boolean;
}

/** The end of the Anatolia map's Neolithic period, a stop of its year bar. */
export const ATLAS_DEEP_PAST_END = -6000;

export const ATLAS_PRESETS: Partial<Record<SettingsPresetId, AtlasPresetState>> = {
  everything: {
    summary: "The whole year range, every place layer, undated places included. The starting state.",
    range: { start: RANGE_START, end: RANGE_END }, showUndated: true, everyLayer: true,
  },
  "deep-past": {
    summary: "Places dated before 6000 BCE, the end of this map's Neolithic period; the range holds the Younger Dryas. Undated places are left out.",
    range: { start: RANGE_START, end: ATLAS_DEEP_PAST_END }, showUndated: false, everyLayer: false,
  },
};

/** The preset the Anatolia map's state matches, or null. */
export function activeAtlasPreset(state: { range: YearRange; showUndated: boolean; everyLayerOn: boolean }): SettingsPresetId | null {
  const match = SETTINGS_PRESETS.find(({ id }) => {
    const preset = ATLAS_PRESETS[id];
    return preset !== undefined && preset.range.start === state.range.start && preset.range.end === state.range.end
      && preset.showUndated === state.showUndated && (!preset.everyLayer || state.everyLayerOn);
  });
  return match?.id ?? null;
}
