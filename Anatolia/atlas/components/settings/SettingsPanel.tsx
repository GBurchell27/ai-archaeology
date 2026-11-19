"use client";

import type { ReactNode } from "react";
import ui from "@/components/globe/chrome/chrome.module.css";
import { PRESETS_ELSEWHERE, SETTINGS_PRESETS, type SettingsPresetId } from "@/lib/settings/settingsPresets";
import { SETTINGS_SECTIONS, type SettingsSectionId } from "@/lib/settings/settingsSections";
import styles from "./SettingsPanel.module.css";

/** A preset as one view applies it. */
export interface SettingsPresetControl {
  summary: string;
  pressed: boolean;
  onApply(): void;
}

export type SettingsPresetControls = Partial<Record<SettingsPresetId, SettingsPresetControl>>;

function PresetRow({ presets }: { presets: SettingsPresetControls }) {
  const missing = SETTINGS_PRESETS.filter((preset) => !presets[preset.id]);
  const pressed = SETTINGS_PRESETS.find((preset) => presets[preset.id]?.pressed);
  return (
    <section className={styles.section} aria-label="Presets" data-settings-section="presets">
      <h3 className={`${ui.eyebrow} ${styles.heading}`}>Presets</h3>
      <div className={styles.presets} role="group" aria-label="Presets">
        {SETTINGS_PRESETS.map((preset) => {
          const control = presets[preset.id];
          return (
            <button
              key={preset.id}
              type="button"
              className={ui.chip}
              data-preset={preset.id}
              aria-pressed={control?.pressed ?? false}
              disabled={!control}
              title={control?.summary ?? preset.elsewhere}
              onClick={control?.onApply}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      {pressed ? <p className={styles.note} data-role="preset-summary">{presets[pressed.id]?.summary}</p> : null}
      {missing.length === SETTINGS_PRESETS.length
        ? <p className={styles.note}>{PRESETS_ELSEWHERE}</p>
        : missing.map((preset) => <p key={preset.id} className={styles.note}>{preset.elsewhere}</p>)}
    </section>
  );
}

/**
 * The settings of a view: the presets, then the same sections in the same order everywhere. It holds no state.
 * A view passes the controls it has for a section; a section it has none for says where that setting applies.
 */
export function SettingsPanel(props: { presets: SettingsPresetControls; sections: Partial<Record<SettingsSectionId, ReactNode>> }) {
  return (
    <div className={styles.panel} data-role="settings-panel">
      <PresetRow presets={props.presets} />
      {SETTINGS_SECTIONS.map((section) => {
        const controls = props.sections[section.id];
        return (
          <section key={section.id} className={styles.section} aria-label={section.title} data-settings-section={section.id} data-settings-here={controls ? "true" : "false"}>
            <h3 className={`${ui.eyebrow} ${styles.heading}`}>{section.title}</h3>
            {controls ?? <p className={styles.note}>{section.elsewhere}</p>}
          </section>
        );
      })}
    </div>
  );
}
