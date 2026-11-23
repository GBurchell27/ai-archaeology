"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CloseButton } from "@/components/chrome/CloseButton";
import { useDismissLayer } from "@/components/chrome/useDismissLayer";
import { DISMISS_PRIORITY } from "@/lib/chrome/dismissStack";
import type { WorldCatalogue } from "@/lib/world/catalogueLoader";
import { MIN_QUERY_LENGTH } from "@/lib/world/siteSearch";
import { siteTypeStyle } from "@/lib/world/siteTypeStyle";
import { formatSiteDates } from "@/lib/world/worldEras";
import type { PickedSite } from "../GlobeSites";
import { SearchIcon } from "./ExplorerIcons";
import ui from "./chrome.module.css";
import styles from "./SiteSearch.module.css";
import { useSiteSearchHits } from "./useSiteSearchHits";

/**
 * Instant search over every name in the catalogue: the core file at once, the rest from the names
 * file fetched when the box is first focused. Enter flies to the highlighted hit, which starts as the best one.
 */
export function SiteSearch(props: { catalogue: WorldCatalogue | null; unavailable?: boolean; onVisit(site: PickedSite): void }) {
  const { catalogue, onVisit } = props;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [everFocused, setEverFocused] = useState(false);
  const { hits, stillReading } = useSiteSearchHits(catalogue, query, everFocused);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  const listOpen = open && query.trim().length >= MIN_QUERY_LENGTH;
  useDismissLayer(listOpen, () => setOpen(false), DISMISS_PRIORITY.search);

  useEffect(() => {
    function focusOnSlash(event: globalThis.KeyboardEvent) {
      const typing = event.target instanceof HTMLElement && event.target.matches("input, textarea, select, [contenteditable]");
      if (event.key !== "/" || typing || event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      input.current?.focus();
    }
    window.addEventListener("keydown", focusOnSlash);
    return () => window.removeEventListener("keydown", focusOnSlash);
  }, []);

  function visit(site: PickedSite | undefined): void {
    if (!site) return;
    onVisit(site);
    setQuery(site.name);
    setOpen(false);
    // A newly opened card has taken the focus by now and will hand it back here when it closes.
    // An already open card has not, so the box lets go itself (and the phone keyboard goes away).
    window.setTimeout(() => { if (document.activeElement === input.current) input.current?.blur(); }, 0);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (hits.length) setActive((active + (event.key === "ArrowDown" ? 1 : hits.length - 1)) % hits.length);
    } else if (event.key === "Enter") {
      visit(hits[active]);
    } else if (event.key === "Escape" && (listOpen || query)) {
      // The first Escape belongs to the search box; the next one reaches the panels.
      event.stopPropagation();
      if (listOpen) setOpen(false);
      else setQuery("");
    }
  }

  return (
    <div className={styles.search} role="search" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <span className={styles.glyph}><SearchIcon /></span>
      <input
        ref={input}
        className={styles.input}
        type="search"
        role="combobox"
        data-role="site-search"
        aria-label="Search published sites by name"
        aria-expanded={listOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={listOpen && hits[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        maxLength={80}
        spellCheck={false}
        placeholder={catalogue ? "Search a site name" : props.unavailable ? "Search needs the catalogue" : "Loading the catalogue…"}
        disabled={props.unavailable}
        value={query}
        onChange={(event) => { setQuery(event.target.value); setActive(0); setOpen(true); }}
        onFocus={() => { setOpen(true); setEverFocused(true); }}
        onKeyDown={onKeyDown}
      />
      <kbd className={styles.key} aria-hidden="true">/</kbd>
      {listOpen ? (
        <div className={`${ui.glass} ${styles.results}`}>
        <div className={styles.resultsHead}><CloseButton name="search results" onClick={() => setOpen(false)} /></div>
        <ul id={listId} className={`${ui.scroll} ${styles.resultList}`} role="listbox" aria-label="Matching sites">
          {hits.map((site, position) => (
            <SearchHit
              key={site.id}
              id={`${listId}-${position}`}
              site={site}
              active={position === active}
              onHover={() => setActive(position)}
              onChoose={() => visit(site)}
            />
          ))}
          {hits.length === 0 ? (
            <li className={styles.empty} role="presentation">
              {stillReading ? "Still reading the catalogue…" : "No published site in the catalogue has that name. Try a shorter part of it."}
            </li>
          ) : null}
        </ul>
        </div>
      ) : null}
    </div>
  );
}

function SearchHit(props: { id: string; site: PickedSite; active: boolean; onHover(): void; onChoose(): void }) {
  const { site } = props;
  const style = siteTypeStyle(site.siteType);
  const dates = formatSiteDates(site.startYear, site.endYear);
  return (
    <li
      id={props.id}
      className={styles.hit}
      role="option"
      aria-selected={props.active}
      onPointerMove={props.onHover}
      // Keeps focus in the input so the list does not close before the click lands.
      onPointerDown={(event) => event.preventDefault()}
      onClick={props.onChoose}
    >
      <i className={ui.swatch} style={{ ["--swatch" as string]: style.color }} />
      <span className={`${ui.serif} ${styles.name}`}>{site.name}</span>
      {site.featured ? <span className={styles.wonder}>Wonder</span> : null}
      <span className={styles.meta}>{style.title}{dates ? ` · ${dates}` : ""}</span>
    </li>
  );
}
