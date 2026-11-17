import type { RefObject } from "react";
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
  return (
    <form className="search" onSubmit={(event) => {
      event.preventDefault();
      if (region) props.onRegion();
      else if (matches[0]) props.onSite(matches[0]);
      else if (wikiMatches[0]) props.onWiki(wikiMatches[0]);
    }}>
      <input
        ref={props.inputRef}
        value={props.query}
        placeholder="Search places"
        aria-label="Search places"
        data-role="search"
        onChange={(event) => props.onQuery(event.target.value)}
      />
      {region || matches.length > 0 || wikiMatches.length > 0 ? (
        <ul>
          {region ? (
            <li><button type="button" data-result="sanliurfa-region" onClick={props.onRegion}>{region.name} region</button></li>
          ) : null}
          {matches.map((site) => (
            <li key={site.id}>
              <button type="button" data-result={site.id} onClick={() => props.onSite(site)}>{site.properties.name}</button>
            </li>
          ))}
          {wikiMatches.map((site) => (
            <li key={site.id}>
              <button type="button" data-result={site.id} onClick={() => props.onWiki(site)}>{site.properties.name}</button>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
