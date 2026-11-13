"use client";

import type { SiteFeature } from "@/lib/types";
import type { WikiFeature } from "@/lib/wikidata";
import { placeLesson } from "@/lib/placeLearning";

export const SCROLL_SPEEDS = [
  { label: "Precise", value: 0.6 },
  { label: "Normal", value: 1 },
  { label: "Fast", value: 1.7 },
] as const;

export function MapNavigation(props: {
  speed: number;
  onSpeed: (value: number) => void;
  onZoom: (direction: number) => void;
}) {
  return (
    <section className="map-nav" aria-label="Map navigation">
      <div className="map-nav-tools">
        <button type="button" aria-label="Zoom in" title="Zoom in (+)" onClick={() => props.onZoom(-1)}>+</button>
        <button type="button" aria-label="Zoom out" title="Zoom out (−)" onClick={() => props.onZoom(1)}>−</button>
        <label className="map-speed">
          <span>Scroll speed</span>
          <select value={props.speed} onChange={(event) => props.onSpeed(Number(event.target.value))}>
            {SCROLL_SPEEDS.map(({ label, value }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
      <p className="map-gestures">Left drag to pan · Right drag to rotate</p>
    </section>
  );
}

export function NearbyPlace(props: {
  site: SiteFeature | WikiFeature;
  onOpen: () => void;
}) {
  const { properties } = props.site;
  const curated = "description" in properties;
  const period = curated ? properties.period : properties.periodLabels[0];
  const description = placeLesson(props.site.id)?.headline
    ?? (curated ? properties.description : properties.types.slice(0, 2).join(" · "));
  return (
    <aside className="nearby-place" aria-label="Nearby place">
      {period ? <p className="nearby-period">{period}</p> : null}
      <h2>{properties.name}</h2>
      {description ? <p className="nearby-summary">{description}</p> : null}
      <button type="button" onClick={props.onOpen}>
        Enter place
        <span aria-hidden="true">↗</span>
      </button>
    </aside>
  );
}
