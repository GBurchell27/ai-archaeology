"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { LAYER_STYLE, PERIODS } from "@/lib/periods";
import type { BaseMap, LayerId } from "@/lib/types";

const THEME_KEY = "atlas-theme";
const LEGEND_KEY = "atlas-legend";

export function useTheme(): ["light" | "dark", () => void] {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const saved = window.localStorage.getItem(THEME_KEY);
    const next = saved === "light" || saved === "dark"
      ? saved
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(next);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;
  }, [theme]);
  function toggle() {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      window.localStorage.setItem(THEME_KEY, next);
      return next;
    });
  }
  return [theme, toggle];
}

export function PeriodDock(props: { periodId: string; onPeriod: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const idle = useRef<number>(0);
  function arm() {
    setOpen(true);
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => setOpen(false), 3200);
  }
  useEffect(() => () => window.clearTimeout(idle.current), []);
  return (
    <div
      className={open ? "dock is-open" : "dock"}
      data-dock={open ? "open" : "closed"}
      onMouseEnter={arm}
      onMouseLeave={() => {
        window.clearTimeout(idle.current);
        idle.current = window.setTimeout(() => setOpen(false), 700);
      }}
      onFocusCapture={arm}
    >
      <button
        type="button"
        className="dock-handle"
        aria-expanded={open}
        aria-controls="period-dock"
        onClick={() => setOpen((value) => !value)}
      >
        Periods
      </button>
      <div className="chips" id="period-dock">
        {PERIODS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={item.id === props.periodId ? "chip is-on" : "chip"}
            data-period={item.id}
            onClick={() => {
              props.onPeriod(item.id);
              arm();
            }}
          >
            <span className="key">{index + 1}</span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Legend(props: { open: boolean; onToggle: () => void }) {
  return (
    <div className={props.open ? "legend is-open" : "legend"} data-legend={props.open ? "open" : "closed"}>
      <button type="button" className="legend-toggle" aria-expanded={props.open} aria-label="Pin legend" onClick={props.onToggle}>
        Key
      </button>
      {props.open ? (
        <div className="legend-body">
          {(Object.keys(LAYER_STYLE) as LayerId[]).map((layer) => (
            <span key={layer}><span className="swatch" style={{ background: LAYER_STYLE[layer].color }} /> {LAYER_STYLE[layer].title}</span>
          ))}
          <span><span className="open-ring" /> approximate</span>
        </div>
      ) : null}
    </div>
  );
}

export function readLegendOpen(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(LEGEND_KEY) !== "closed";
}

export function storeLegend(open: boolean) {
  window.localStorage.setItem(LEGEND_KEY, open ? "open" : "closed");
}

export function ShortcutOverlay(props: { onClose: () => void }) {
  return (
    <div className="help" role="dialog" aria-label="Keyboard shortcuts" data-help="open">
      <button type="button" className="close" onClick={props.onClose}>Close</button>
      <h2>Shortcuts</h2>
      <ul>
        <li><kbd>1</kbd>–<kbd>5</kbd> Period chips</li>
        <li><kbd>N</kbd> Neolithic <kbd>B</kbd> Bronze <kbd>L</kbd> Classical <kbd>C</kbd> Crusader</li>
        <li><kbd>R</kbd> Relief <kbd>H</kbd> Hypsometric <kbd>S</kbd> Satellite</li>
        <li><kbd>/</kbd> Search <kbd>Esc</kbd> Close <kbd>0</kbd> Reset view</li>
        <li><kbd>+</kbd> Zoom in <kbd>−</kbd> Zoom out</li>
        <li>Left drag pans · Right drag rotates</li>
        <li>Touch drag pans · Pinch zooms · Two-finger drag tilts</li>
        <li><kbd>D</kbd> Dark mode <kbd>?</kbd> This list</li>
      </ul>
    </div>
  );
}

export interface AtlasKeyHandlers {
  onPeriod: (id: string) => void;
  onLayer: (layer: LayerId) => void;
  onBase: (base: BaseMap) => void;
  onSearch: () => void;
  onEscape: () => void;
  onReset: () => void;
  onZoom: (steps: number) => void;
  onTheme: () => void;
  onHelp: () => void;
}

export function useAtlasKeys(handlers: MutableRefObject<AtlasKeyHandlers>) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = Boolean(target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable));
      const api = handlers.current;
      if (event.key === "Escape") {
        api.onEscape();
        return;
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      const periodIndex = Number(event.key) - 1;
      if (event.key >= "1" && event.key <= "5" && PERIODS[periodIndex]) {
        api.onPeriod(PERIODS[periodIndex].id);
      } else if (event.key === "0" || event.key === "Home") {
        api.onReset();
      } else if (["+", "=", "-", "−"].includes(event.key)) {
        event.preventDefault();
        api.onZoom(event.key === "+" || event.key === "=" ? -1 : 1);
      } else if (event.key === "?") {
        api.onHelp();
      } else if (event.key === "/") {
        event.preventDefault();
        api.onSearch();
      } else if (event.key.toLowerCase() === "n") {
        api.onLayer("neolithic");
      } else if (event.key.toLowerCase() === "b") {
        api.onLayer("bronze");
      } else if (event.key.toLowerCase() === "l") {
        api.onLayer("classical");
      } else if (event.key.toLowerCase() === "c") {
        api.onLayer("crusader");
      } else if (event.key.toLowerCase() === "r") {
        api.onBase("relief");
      } else if (event.key.toLowerCase() === "h") {
        api.onBase("hypsometric");
      } else if (event.key.toLowerCase() === "s") {
        api.onBase("satellite");
      } else if (event.key.toLowerCase() === "d") {
        api.onTheme();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlers]);
}
