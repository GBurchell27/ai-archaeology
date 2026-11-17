"use client";

import { GlobeControls, TilesPlugin, TilesRenderer, TilesRendererContext } from "3d-tiles-renderer/r3f";
import * as TilesPlugins from "3d-tiles-renderer/plugins";
import { useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_GLOBE_BASEMAP, FALLBACK_GLOBE_BASEMAP, basemapTileUrl, type GlobeBasemap } from "@/lib/globe/basemaps";
import { WGS84_EQUATORIAL_RADIUS } from "@/lib/globe/ellipsoid";

// 0.5.4 ships GeneratedSurfacePlugin from the plugins entry but leaves it out of the type declarations.
const { GeneratedSurfacePlugin } = TilesPlugins as unknown as {
  GeneratedSurfacePlugin: new (options: {
    overlay: TilesPlugins.ImageOverlay;
    projection?: "ellipsoid";
    endCaps?: boolean;
    applyOverlayTexture?: boolean;
  }) => void;
};

const OCEAN_FILL = "#0a1722";
const CLOSEST_APPROACH_METRES = 60_000;
// GlobeControls parks the far plane on the horizon; the atmosphere glow lives up to 0.4 radii behind it.
const FAR_MARGIN_RADII = 0.5;

/** The default basemap, or the fallback when the default host does not answer. */
export function useGlobeBasemap(): GlobeBasemap {
  const [basemap, setBasemap] = useState(DEFAULT_GLOBE_BASEMAP);
  useEffect(() => {
    const probe = new Image();
    probe.crossOrigin = "anonymous";
    probe.onerror = () => setBasemap(FALLBACK_GLOBE_BASEMAP);
    probe.src = basemapTileUrl(DEFAULT_GLOBE_BASEMAP, 0, 0, 0);
    return () => { probe.onerror = null; };
  }, []);
  return basemap;
}

/** WGS84 ellipsoid with streamed imagery and orbit controls. Scene frame: see lib/globe/ellipsoid.ts. */
export function GlobeSurface({ basemap }: { basemap: GlobeBasemap }) {
  const surfaceOptions = useMemo(() => ({
    overlay: new TilesPlugins.XYZTilesOverlay({ url: basemap.urlTemplate, levels: basemap.maxLevel + 1 }),
    // Web-Mercator stops at ±85°; endCaps pulls the last tile row up to the pole.
    endCaps: true,
    applyOverlayTexture: true,
  }), [basemap]);
  return (
    <>
      {/* Shows through while tiles stream, so the globe is never a hole in the sky. */}
      <mesh scale={WGS84_EQUATORIAL_RADIUS * 0.99}>
        <sphereGeometry args={[1, 64, 48]} />
        <meshBasicMaterial color={OCEAN_FILL} />
      </mesh>
      <TilesRenderer key={basemap.id}>
        <TilesPlugin plugin={GeneratedSurfacePlugin} args={[surfaceOptions]} />
        <SurfaceControls />
      </TilesRenderer>
    </>
  );
}

function SurfaceControls() {
  const tiles = useContext(TilesRendererContext);
  // Raycast the tiles only, so site points and atmosphere shells never become the drag pivot.
  return <GlobeControls scene={tiles?.group} enableDamping minDistance={CLOSEST_APPROACH_METRES} farMargin={FAR_MARGIN_RADII} />;
}
