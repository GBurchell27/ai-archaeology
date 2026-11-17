import { useEffect, useRef, useState } from "react";
import { decodeHeight } from "@/lib/terrain";
import type { AtlasMetadata, SiteCollection, SiteFeature } from "@/lib/types";
import type { WikiFeature } from "@/lib/wikidata";

export interface AtlasData {
  metadata: AtlasMetadata | null;
  sites: SiteFeature[];
  metres: Float32Array | null;
  wikiSites: WikiFeature[];
  error: string | null;
}

/** Loads the national terrain, the curated sites and the Wikidata catalogue.
 *  `onLoaded` runs in the same tick as the terrain state, so the caller's first pose lands with it. */
export function useAtlasData(onLoaded: (atlas: AtlasMetadata, metres: Float32Array) => void): AtlasData {
  const [metadata, setMetadata] = useState<AtlasMetadata | null>(null);
  const [sites, setSites] = useState<SiteFeature[]>([]);
  const [metres, setMetres] = useState<Float32Array | null>(null);
  const [wikiSites, setWikiSites] = useState<WikiFeature[]>([]);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(onLoaded);
  loaded.current = onLoaded;

  useEffect(() => {
    fetch("/wikidata/sites.geojson")
      .then((response) => response.json())
      .then((collection: { features: WikiFeature[] }) => setWikiSites(collection.features))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancel = false;
    Promise.all([
      fetch("/terrain/metadata.json").then((response) => response.json() as Promise<AtlasMetadata>),
      fetch("/sites.geojson").then((response) => response.json() as Promise<SiteCollection>),
    ]).then(async ([atlas, collection]) => {
      const response = await fetch(`/terrain/${atlas.heightFile}`);
      const grid = decodeHeight(
        await response.arrayBuffer(),
        atlas.width,
        atlas.height,
        atlas.elevation.min,
        atlas.elevation.max,
      );
      if (cancel) {
        return;
      }
      setMetadata(atlas);
      setSites(collection.features);
      setMetres(grid);
      loaded.current(atlas, grid);
      document.body.dataset.ready = "true";
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "The atlas failed to load");
    });
    return () => {
      cancel = true;
    };
  }, []);

  return { metadata, sites, metres, wikiSites, error };
}
