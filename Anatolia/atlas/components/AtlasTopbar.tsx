import type { ReactNode } from "react";
import { SlidersIcon, ThemeIcon } from "@/components/AtlasIcons";

export function AtlasTopbar(props: {
  regionName: string | null;
  /** The search box, placed between the map views and the tool buttons. */
  search: ReactNode;
  tripOpen: boolean;
  landscapeOpen: boolean;
  night: boolean;
  onOverview: () => void;
  onRegion: () => void;
  onTrip: () => void;
  onLandscape: () => void;
  onTheme: () => void;
  onHelp: () => void;
  onSettings: () => void;
  /** Shown only when the atlas sits under the world globe. */
  onGlobe?: () => void;
  /** Opens the Taş Tepeler tour on the globe. */
  onStartTasTepelerTour?: () => void;
}) {
  return (
    <header className="topbar">
      <nav className="map-places" aria-label="Map views">
        {props.onGlobe ? (
          <button type="button" className="brand" data-action="globe" aria-label="Back to the world globe" onClick={props.onGlobe}>Globe</button>
        ) : null}
        <button type="button" className="brand" data-action="overview" aria-label="Turkey overview" onClick={props.onOverview}>Turkey</button>
        {props.regionName ? (
          <button type="button" className="brand region-button" data-action="regional-overview" onClick={props.onRegion}>{props.regionName}</button>
        ) : null}
        {props.onStartTasTepelerTour ? (
          <button type="button" className="brand region-button" data-action="tas-tepeler-tour" aria-label="Start the Taş Tepeler tour" onClick={props.onStartTasTepelerTour}>
            Taş Tepeler
          </button>
        ) : null}
      </nav>
      {props.search}
      <button type="button" className="icon-button landscape-toggle" data-action="trip" aria-label="Replay our April 2026 trip" aria-pressed={props.tripOpen} onClick={props.onTrip}>
        <span>Trip</span>
      </button>
      <button type="button" className="icon-button landscape-toggle" data-action="landscape" aria-label="Landscape statistics" aria-pressed={props.landscapeOpen} onClick={props.onLandscape}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2.5 13.5h11M4 11V8m4 3V3m4 8V5" />
        </svg>
        <span>Landscape</span>
      </button>
      <button type="button" className="icon-button" aria-label={props.night ? "Switch to light mode" : "Switch to dark mode"} data-action="theme" onClick={props.onTheme}>
        <ThemeIcon night={props.night} />
      </button>
      <button type="button" className="icon-button" aria-label="Keyboard shortcuts" data-action="help" onClick={props.onHelp}>?</button>
      <button type="button" className="icon-button" aria-label="Settings" data-action="settings" onClick={props.onSettings}>
        <SlidersIcon />
      </button>
    </header>
  );
}
