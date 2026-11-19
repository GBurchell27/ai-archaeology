"use client";

import { useTheme } from "@/components/AtlasChrome";
import ui from "@/components/globe/chrome/chrome.module.css";
import styles from "./SettingsPanel.module.css";

/** The one theme control, the same in every view. */
export function ThemeSetting({ theme, onToggle }: { theme: "light" | "dark"; onToggle(): void }) {
  return (
    <>
      <label className={`${ui.switch} ${styles.toggle}`}>
        <input type="checkbox" data-role="theme-dark" checked={theme === "dark"} onChange={onToggle} />
        <span className={ui.switchTrack} />
        <span>Dark mode</span>
      </label>
      <p className={styles.note}>Dark mode dims the Anatolia map to a night light. The choice is remembered in this browser.</p>
    </>
  );
}

/** For a view that keeps no theme state of its own: reads and saves the choice the Anatolia map uses. */
export function SavedThemeSetting() {
  const [theme, toggleTheme] = useTheme();
  return <ThemeSetting theme={theme} onToggle={toggleTheme} />;
}
