"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  intersectRayWithEllipsoid,
  sceneToLonLatHeight,
  type GlobeLook,
} from "@/lib/globe/ellipsoid";
import { atlasLookFromGlobe, handoffStage, type AtlasLook, type HandoffStage } from "@/lib/globe/handoff";
import { DEFAULT_GLOBE_LOOK } from "@/lib/globe/viewUrl";
import { GlobeAtmosphere } from "./GlobeAtmosphere";
import { GlobeFlight, type GlobeFlyTo } from "./GlobeFlight";
import { GlobeSurface, useGlobeBasemap } from "./GlobeSurface";
import styles from "./GlobeView.module.css";

export interface GlobeViewProps {
  /** Where the camera opens. Read once, on mount. Omit it for the default view with a slow idle turn. */
  initialLook?: GlobeLook;
  /** The point at the centre of the screen and the camera altitude (metres), at most ~8 times a second. */
  onLookChange?: (look: GlobeLook) => void;
  /** The user asked for, or zoomed into, the Anatolia terrain atlas. */
  onEnterAtlas?: (look: AtlasLook) => void;
  /** Fly to a place; change `token` to fly again. */
  flyTo?: GlobeFlyTo | null;
  /** Rendered inside the Canvas, in the ECEF-metre scene frame of lib/globe/ellipsoid.ts. */
  children?: ReactNode;
  /** DOM chrome laid over the canvas. The layer ignores the pointer; set `pointer-events: auto` on controls. */
  overlay?: ReactNode;
}

const SPACE = "#04060a";
const REPORT_INTERVAL_MS = 120;

export function GlobeView(props: GlobeViewProps) {
  const { onLookChange, onEnterAtlas } = props;
  const opening = useRef(props.initialLook ?? DEFAULT_GLOBE_LOOK);
  const basemap = useGlobeBasemap();
  const [stage, setStage] = useState<HandoffStage>("none");
  const latestLook = useRef<GlobeLook>(opening.current);
  const readout = useRef<HTMLParagraphElement>(null);
  // A link that opens low over Turkey must not bounce straight into the atlas: only a zoom that crosses the line does.
  const crossedFromAbove = useRef(false);

  const enterAtlas = useCallback(() => {
    onEnterAtlas?.(atlasLookFromGlobe(latestLook.current));
  }, [onEnterAtlas]);

  const reportLook = useCallback((look: GlobeLook) => {
    latestLook.current = look;
    if (readout.current) readout.current.textContent = formatLook(look);
    const next = handoffStage(look);
    setStage(next);
    if (next !== "enter") crossedFromAbove.current = true;
    else if (crossedFromAbove.current) {
      crossedFromAbove.current = false;
      enterAtlas();
    }
    onLookChange?.(look);
  }, [enterAtlas, onLookChange]);

  return (
    <div className={styles.globe} data-view="globe" data-handoff={stage}>
      {/* Before the canvas in the document, so Tab reaches search and the panels before the count badges on the globe. */}
      <div className={styles.chrome}>
        {props.overlay}
        {stage !== "none" && onEnterAtlas ? (
          <button type="button" className={styles.enter} data-action="enter-atlas" onClick={enterAtlas}>
            <span className={styles.enterTitle}>Enter Anatolia terrain</span>
            <span className={styles.enterHint}>or keep zooming in</span>
          </button>
        ) : null}
        <p ref={readout} className={styles.readout} data-role="globe-look" aria-label="View centre and camera altitude">
          {formatLook(opening.current)}
        </p>
        <p className={styles.attribution} data-role="imagery-attribution">
          Imagery: <a href={basemap.attributionUrl} target="_blank" rel="noreferrer">{basemap.attribution}</a>
          {" · "}{basemap.licence}
        </p>
      </div>
      <Canvas
        flat
        dpr={[1, 2]}
        camera={{ fov: 45, near: 1e4, far: 1e9 }}
        gl={{ antialias: true, logarithmicDepthBuffer: true }}
      >
        <color attach="background" args={[SPACE]} />
        <GlobeAtmosphere />
        <GlobeSurface basemap={basemap} />
        <GlobeFlight initialLook={opening.current} flyTo={props.flyTo} idleSpin={!props.initialLook} />
        <GlobeLookReporter onLook={reportLook} />
        {props.children}
      </Canvas>
    </div>
  );
}

/** Reports what the camera is looking at, throttled, and only when it has moved. */
function GlobeLookReporter({ onLook }: { onLook: (look: GlobeLook) => void }) {
  const state = useMemo(() => ({ due: 0, signature: "" }), []);
  useEffect(() => { state.signature = ""; }, [onLook, state]);
  useFrame(({ camera }) => {
    const now = performance.now();
    if (now < state.due) return;
    state.due = now + REPORT_INTERVAL_MS;
    const position = camera.position.toArray();
    const forward = camera.getWorldDirection(camera.position.clone()).toArray();
    const beneathCamera = sceneToLonLatHeight(position);
    // A tilted camera can look past the limb; then the place under the camera stands in.
    const centre = intersectRayWithEllipsoid(position, forward);
    const place = centre ? sceneToLonLatHeight(centre) : beneathCamera;
    const look = { longitude: place.longitude, latitude: place.latitude, altitude: beneathCamera.height };
    const signature = `${look.longitude.toFixed(3)},${look.latitude.toFixed(3)},${Math.round(look.altitude / 500)}`;
    if (signature === state.signature) return;
    state.signature = signature;
    onLook(look);
  });
  return null;
}

function formatLook(look: GlobeLook): string {
  const latitude = `${Math.abs(look.latitude).toFixed(2)}°${look.latitude < 0 ? "S" : "N"}`;
  const longitude = `${Math.abs(look.longitude).toFixed(2)}°${look.longitude < 0 ? "W" : "E"}`;
  const kilometres = Math.round(look.altitude / 1000).toLocaleString("en-GB");
  return `${latitude}  ${longitude}  ·  ${kilometres} km`;
}
