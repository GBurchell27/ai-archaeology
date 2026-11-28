"use client";

import { useState, type RefObject } from "react";
import { CloseButton } from "@/components/chrome/CloseButton";
import { useDismissLayer } from "@/components/chrome/useDismissLayer";
import { DISMISS_PRIORITY } from "@/lib/chrome/dismissStack";
import type { PlaceSearchResult } from "@/lib/search";
import type { RegionalTerrain, SiteFeature } from "@/lib/types";
import type { WikiFeature } from "@/lib/wikidata";

export function AtlasSearch(props: {
  query: string;
  onQuery: (query: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  result: PlaceSearchResult;
  regional: RegionalTerrain | null;
  onRegion: () => void;
  onSite: (site: SiteFeature) => void;
  onWiki: (site: WikiFeature) => void;
}) {
  const { matches, wikiMatches } = props.result;
  const region = props.result.regionMatch ? props.regional : null;
  const listed = Boolean(region || matches.length > 0 || wikiMatches.length > 0);
  const [hiddenQuery, setHiddenQuery] = useState<string | null>(null);
  const shown = listed && hiddenQuery !== props.query;
  useDismissLayer(shown, () => setHiddenQuery(props.query), DISMISS_PRIORITY.search);
  function pick(choose: () => void): void {
    setHiddenQuery(props.query);
    choose();
  }
  return (
    <form className="search" onSubmit={(event) => {
      event.preventDefault();
      if (region) pick(props.onRegion);
      else if (matches[0]) pick(() => props.onSite(matches[0]));
      else if (wikiMatches[0]) pick(() => props.onWiki(wikiMatches[0]));
    }}>
      <input
        ref={props.inputRef}
        value={props.query}
        placeholder="Search places"
        aria-label="Search places"
        data-role="search"
        onChange={(event) => props.onQuery(event.target.value)}
      />
      {shown ? (
        <div className="search-results">
        <div className="search-results-bar">
          <CloseButton name="search results" onClick={() => setHiddenQuery(props.query)} />
        </div>
        <ul>
          {region ? (
            <li><button type="button" data-result="sanliurfa-region" onClick={() => pick(props.onRegion)}>{region.name} region</button></li>
          ) : null}
          {matches.map((site) => (
            <li key={site.id}>
              <button type="button" data-result={site.id} onClick={() => pick(() => props.onSite(site))}>{site.properties.name}</button>
            </li>
          ))}
          {wikiMatches.map((site) => (
            <li key={site.id}>
              <button type="button" data-result={site.id} onClick={() => pick(() => props.onWiki(site))}>{site.properties.name}</button>
            </li>
          ))}
        </ul>
        </div>
      ) : null}
    </form>
  );
}
