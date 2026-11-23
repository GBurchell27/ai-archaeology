"use client";

import { AtlasBaseMapSettings, AtlasLabelSetting, AtlasLayerSettings, AtlasTimelineSettings } from "@/components/atlas/AtlasSettingsSections";
import { CloseButton } from "@/components/chrome/CloseButton";
import { useDismissLayer } from "@/components/chrome/useDismissLayer";
import { DISMISS_PRIORITY } from "@/lib/chrome/dismissStack";
import type { AtlasPreferences } from "@/components/atlas/useAtlasPreferences";
import type { ContextLayersState } from "@/components/atlas/useContextLayers";
import type { MapDisplay } from "@/components/atlas/useMapDisplay";
import type { RegionalTerrainState } from "@/components/atlas/useRegionalTerrain";
import type { TimelineState } from "@/components/atlas/useTimelineState";
import { SettingsPanel, type SettingsPresetControls } from "@/components/settings/SettingsPanel";
import { ThemeSetting } from "@/components/settings/ThemeSetting";
import { ATLAS_PRESETS, activeAtlasPreset, type AtlasPresetState, type SettingsPresetId } from "@/lib/settings/settingsPresets";
import type { LayerId, RegionalTerrain } from "@/lib/types";

/** The presets this map can apply: they set its year range, its undated switch and, for the reset, its place layers. */
function atlasPresetControls(timeline: TimelineState, display: MapDisplay): SettingsPresetControls {
  const placeLayers = Object.keys(display.layers) as LayerId[];
  const everyLayerOn = display.wikiOn && placeLayers.every((layer) => display.layers[layer]);
  const active = activeAtlasPreset({ range: timeline.range, showUndated: timeline.showUndated, everyLayerOn });
  const apply = (preset: AtlasPresetState) => {
    timeline.changeRange(preset.range);
    timeline.setShowUndated(preset.showUndated);
    if (!preset.everyLayer) return;
    placeLayers.forEach((layer) => display.setLayer(layer, true));
    display.setWikiOn(true);
  };
  return Object.fromEntries((Object.entries(ATLAS_PRESETS) as [SettingsPresetId, AtlasPresetState][]).map(([id, preset]) => [
    id, { summary: preset.summary, pressed: active === id, onApply: () => apply(preset) },
  ]));
}

/** The Anatolia map's settings: the shared panel, filled with this map's own controls and state. */
export function SettingsMenu(props: {
  onClose(): void;
  display: MapDisplay;
  preferences: AtlasPreferences;
  timeline: TimelineState;
  context: ContextLayersState;
  regional: RegionalTerrain | null;
  region: RegionalTerrainState;
  onClimate: (recordId: string) => void;
}) {
  const { display, preferences, timeline } = props;
  useDismissLayer(true, props.onClose, DISMISS_PRIORITY.panel);
  return (
    <aside className="menu" aria-label="Settings">
      <div className="menu-dismiss"><CloseButton name="settings" onClick={props.onClose} /></div>
      <SettingsPanel
        presets={atlasPresetControls(timeline, display)}
        sections={{
          layers: <AtlasLayerSettings display={display} context={props.context} onClimate={props.onClimate} />,
          timeline: <AtlasTimelineSettings timeline={timeline} />,
          "base-map": <AtlasBaseMapSettings display={display} preferences={preferences} regional={props.regional} region={props.region} />,
          theme: <ThemeSetting theme={preferences.theme} onToggle={preferences.toggleTheme} />,
          labels: <AtlasLabelSetting display={display} />,
        }}
      />
    </aside>
  );
}
