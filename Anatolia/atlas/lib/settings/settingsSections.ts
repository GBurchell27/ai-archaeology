// The sections of the settings panel. Every view shows all of them, in this order, so the panel reads the same everywhere.

export type SettingsSectionId = "layers" | "timeline" | "base-map" | "theme" | "labels" | "walk";

export interface SettingsSection {
  id: SettingsSectionId;
  title: string;
  /** The one line a view shows when it has no control for this section: where the setting does apply. */
  elsewhere: string;
}

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  { id: "layers", title: "Layers", elsewhere: "Layers are switched on the globe and on the Anatolia map." },
  { id: "timeline", title: "Timeline", elsewhere: "The timeline applies on the globe and on the Anatolia map." },
  { id: "base-map", title: "Base map", elsewhere: "The base map is chosen on the globe and on the Anatolia map." },
  { id: "theme", title: "Theme", elsewhere: "The theme is chosen in every view." },
  { id: "labels", title: "Labels", elsewhere: "Labels are switched on the globe and on the Anatolia map." },
  { id: "walk", title: "Walk", elsewhere: "Walk options apply inside a site walk." },
];
