"use client";

import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { SavedThemeSetting } from "@/components/settings/ThemeSetting";
import type { MoveMode } from "@/lib/walk/walkMovement";
import { ModeButton } from "./WalkHud";
import { WALK_PANEL_GROUP } from "./WalkKeyLegend";
import styles from "./WalkSettings.module.css";
import { WalkSourceToggle, type WalkSource } from "./WalkSourceToggle";
import walk from "./WalkView.module.css";

const NO_PRESETS = {};
const LAYERS_POINTER = "The conjectural layers are under “What it might have looked like”, each with whose hypothesis it is and its sources. All are off until asked for.";

type WalkSettingsProps = {
  locked: boolean;
  /** The site has a model as well as photographs, and so a choice between them. */
  hasModel: boolean;
  /** The model on screen has conjectural layers. */
  hasLayers: boolean;
  /** There is a reconstruction to move through. */
  ready: boolean;
  source: WalkSource;
  mode: MoveMode;
  onChooseSource: (source: WalkSource) => void;
  onToggleMode: () => void;
};

/**
 * The settings panel as the walk shows it: one more disclosure of the right-hand column, closed until asked for.
 * The source toggle and the mode button above it stay where they are; the same two choices are also here.
 */
export function WalkSettings({ locked, hasModel, hasLayers, ready, source, mode, onChooseSource, onToggleMode }: WalkSettingsProps) {
  return (
    <details className={walk.disclosure} name={WALK_PANEL_GROUP} data-locked={locked} data-role="walk-settings">
      <summary>Settings</summary>
      <div className={styles.body}>
        <SettingsPanel
          presets={NO_PRESETS}
          sections={{
            layers: hasLayers ? <p className={styles.line}>{LAYERS_POINTER}</p> : undefined,
            theme: <SavedThemeSetting />,
            walk: (
              <div className={styles.choices}>
                {hasModel ? <WalkSourceToggle source={source} locked={locked} onChoose={onChooseSource} /> : null}
                {ready ? <ModeButton mode={mode} locked={locked} onToggleMode={onToggleMode} /> : null}
                <p className={styles.line}>Every key is listed under “Keys”.</p>
              </div>
            ),
          }}
        />
      </div>
    </details>
  );
}
