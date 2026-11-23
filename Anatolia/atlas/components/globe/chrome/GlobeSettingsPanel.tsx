"use client";

import type { ReactNode } from "react";
import { SafeLink } from "@/components/SafeLink";
import { SettingsPanel, type SettingsPresetControls } from "@/components/settings/SettingsPanel";
import { SavedThemeSetting } from "@/components/settings/ThemeSetting";
import { NEWS_RECENCY_DAYS } from "@/lib/news/recentNews";
import { GLOBE_PRESETS, SETTINGS_PRESETS, activeGlobePreset } from "@/lib/settings/settingsPresets";
import type { NamedPeriod } from "@/lib/world/namedPeriods";
import { OSM_MEGALITH_STYLE } from "@/lib/world/siteTypeStyle";
import { PaleoControls } from "../paleo/PaleoControls";
import type { GlobeExplorerViewModel } from "../useGlobeExplorer";
import ui from "./chrome.module.css";
import { GlobeBasemapSetting } from "./GlobeBasemapSetting";
import styles from "./GlobeSettingsPanel.module.css";
import { GlobeTimelineSetting } from "./GlobeTimelineSetting";
import { PanelShell } from "./PanelShell";
import { SiteTypeFilter } from "./SiteTypeFilter";

const NO_SITE_TYPES: string[] = [];

function LayerSwitch(props: { dataRole: string; title: string; checked: boolean; onChange(checked: boolean): void; children: ReactNode }) {
  return (
    <div className={styles.layer}>
      <label className={`${ui.switch} ${styles.layerSwitch}`}>
        <input type="checkbox" data-role={props.dataRole} checked={props.checked} onChange={(event) => props.onChange(event.target.checked)} />
        <span className={ui.switchTrack} />
        <span className={styles.layerTitle}>{props.title}</span>
      </label>
      <p className={`${ui.prose} ${styles.note}`}>{props.children}</p>
    </div>
  );
}

function globePresetControls(explorer: GlobeExplorerViewModel, siteTypes: string[]): SettingsPresetControls {
  const { filters, applyPreset } = explorer;
  const active = activeGlobePreset({ ...filters, osmMegaliths: explorer.showOsmMegaliths }, siteTypes);
  return Object.fromEntries(SETTINGS_PRESETS.map(({ id }) => [
    id, { summary: GLOBE_PRESETS[id].summary, pressed: active === id, onApply: () => applyPreset(id) },
  ]));
}

/** What is drawn on the globe besides the main catalogue: the Layers section of the settings panel. */
function GlobeLayerSettings({ explorer, siteTypes, modelSlot }: { explorer: GlobeExplorerViewModel; siteTypes: string[]; modelSlot?: ReactNode }) {
  const { filters } = explorer;
  const osmMegaliths = explorer.catalogue?.index.osmMegaliths;
  return (
    <>
      <LayerSwitch dataRole="featured-only" title="Wonders only" checked={filters.featuredOnly} onChange={filters.setFeaturedOnly}>
        Hide everything except the hand-picked monuments.
      </LayerSwitch>
      <LayerSwitch dataRole="news-pins" title="In the news" checked={explorer.showNewsPins} onChange={explorer.setShowNewsPins}>
        A quiet ring on each catalogue site with a report from the last {NEWS_RECENCY_DAYS} days, while that site is showing. The list is in the legend.
      </LayerSwitch>
      {osmMegaliths ? (
        <LayerSwitch dataRole="osm-megaliths" title="OpenStreetMap megaliths" checked={explorer.showOsmMegaliths} onChange={explorer.setShowOsmMegaliths}>
          <i className={ui.swatch} style={{ ["--swatch" as string]: OSM_MEGALITH_STYLE.color }} /> {osmMegaliths.count.toLocaleString("en-GB")} standing stones, dolmens and
          stone rows mapped by volunteers, kept apart from the catalogue because of its share-alike licence. Almost none carry dates, so they go when undated sites are switched off.{" "}
          <SafeLink href={OSM_MEGALITH_STYLE.attributionUrl}>{OSM_MEGALITH_STYLE.attribution}</SafeLink>.
        </LayerSwitch>
      ) : null}
      <div className={styles.layer} data-role="settings-site-types">
        <SiteTypeFilter
          siteTypes={siteTypes}
          counts={filters.counts?.byType ?? null}
          hiddenTypes={filters.hiddenTypes}
          onToggle={filters.toggleType}
          onSolo={filters.soloType}
          onShowAll={filters.showAllTypes}
        />
      </div>
      <section className={styles.model} aria-label="Ice and sea level layer" data-role="paleo-slot"><PaleoControls paleo={explorer.paleo} /></section>
      {/* The recording-pattern layer's controls, mounted as they are: this panel knows nothing else about that layer. */}
      {modelSlot ? <section className={styles.model} aria-label="Recording-pattern layer" data-role="model-slot">{modelSlot}</section> : null}
    </>
  );
}

/** The globe's settings: the shared panel, filled with the globe's own controls and state. */
export function GlobeSettingsPanel(props: {
  explorer: GlobeExplorerViewModel;
  namedPeriods: readonly NamedPeriod[];
  /** The imagery on the globe now. */
  basemapId: string;
  modelSlot?: ReactNode;
  onClose(): void;
}) {
  const { explorer } = props;
  const { filters } = explorer;
  const siteTypes = explorer.catalogue?.index.siteTypes ?? NO_SITE_TYPES;
  const presets = globePresetControls(explorer, siteTypes);
  return (
    <PanelShell dataRole="globe-settings" title="Settings" closeName="settings" onClose={props.onClose}>
      <SettingsPanel
        presets={presets}
        sections={{
          layers: <GlobeLayerSettings explorer={explorer} siteTypes={siteTypes} modelSlot={props.modelSlot} />,
          timeline: (
            <GlobeTimelineSetting span={filters.yearSpan} showUndated={filters.showUndated} namedPeriods={props.namedPeriods} onSpan={filters.setYearSpan} onShowUndated={filters.setShowUndated} />
          ),
          "base-map": <GlobeBasemapSetting basemapId={props.basemapId} onBasemap={explorer.setBasemapId} />,
          theme: <SavedThemeSetting />,
          labels: (
            <LayerSwitch dataRole="show-labels" title="Labels" checked={explorer.showLabels} onChange={explorer.setShowLabels}>
              Names of the wonders, and the counts over crowded regions.
            </LayerSwitch>
          ),
        }}
      />
    </PanelShell>
  );
}
