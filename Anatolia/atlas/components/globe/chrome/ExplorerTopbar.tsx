"use client";

import type { ReactNode } from "react";
import type { WorldCatalogue } from "@/lib/world/catalogueLoader";
import type { PickedSite } from "../GlobeSites";
import type { ExplorerPanel } from "../useGlobeExplorer";
import { AboutIcon, AccountIcon, MostVotedIcon, SettingsIcon, TheoriesIcon, WondersIcon } from "./ExplorerIcons";
import ui from "./chrome.module.css";
import styles from "./ExplorerTopbar.module.css";
import { SiteSearch } from "./SiteSearch";

const PANEL_BUTTONS: { panel: ExplorerPanel; label: string; icon: ReactNode }[] = [
  { panel: "wonders", label: "Wonders", icon: <WondersIcon /> },
  { panel: "theories", label: "Theories", icon: <TheoriesIcon /> },
  { panel: "settings", label: "Settings", icon: <SettingsIcon /> },
  { panel: "about", label: "About", icon: <AboutIcon /> },
];

/** With accounts configured: the public vote list beside the wonders, and the visitor's own space at the end. */
function panelButtons(accountLabel: string | null): typeof PANEL_BUTTONS {
  if (!accountLabel) return PANEL_BUTTONS;
  return [
    PANEL_BUTTONS[0],
    { panel: "most-voted", label: "Most voted", icon: <MostVotedIcon /> },
    ...PANEL_BUTTONS.slice(1),
    { panel: "account", label: accountLabel, icon: <AccountIcon /> },
  ];
}

/** Title, search, and the panel buttons. */
export function ExplorerTopbar(props: {
  catalogue: WorldCatalogue | null;
  catalogueFailed: boolean;
  /** The panel on show, or null when none is (or a site card covers it). */
  openPanel: ExplorerPanel | null;
  /** "Sign in" or "Account"; null when accounts are not configured, and then neither account button shows. */
  accountLabel: string | null;
  onVisit(site: PickedSite): void;
  onTogglePanel(panel: ExplorerPanel): void;
}) {
  return (
    <header className={styles.topbar}>
      <h1 className={`${ui.serif} ${styles.brand}`}>Atlas of early monuments</h1>
      <SiteSearch catalogue={props.catalogue} unavailable={props.catalogueFailed} onVisit={props.onVisit} />
      <nav className={styles.panels} aria-label="Panels">
        {panelButtons(props.accountLabel).map(({ panel, label, icon }) => (
          <button
            key={panel}
            type="button"
            className={`${ui.button} ${styles.panelButton}`}
            data-action={`open-${panel}`}
            aria-expanded={props.openPanel === panel}
            aria-label={label}
            onClick={() => props.onTogglePanel(panel)}
          >
            {icon}<span className={styles.label}>{label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}
