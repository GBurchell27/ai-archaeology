"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { DrapeId } from "@/lib/place/placeDrape";
import {
  framingCameraOffset,
  gridHeightAt,
  groundMetresPerPixel,
  lonLatToMercator,
  scaleBarFor,
  verticalScale,
  type ScaleBar,
} from "@/lib/place/placeGeometry";
import type { PlaceSite } from "@/lib/place/placeSite";
import type { PlaceTerrain } from "@/lib/place/placeTerrain";
import { hazeBackground } from "@/lib/sky";
import { PlaceTerrainBlock, type PlaceMarker } from "./PlaceTerrainBlock";

const FOV_DEGREES = 35;
const CAMERA_AZIMUTH = 135; // from the south-east
const CAMERA_ELEVATION = 35;
const MAX_POLAR = THREE.MathUtils.degToRad(82);
const SCALE_BAR_MAX_PIXELS = 120;

export interface PlaceViewReadout {
  /** Compass bearing the camera looks along, degrees. */
  heading: number;
  bar: ScaleBar;
}

class DrapeBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function Backdrop() {
  const { scene } = useThree();
  useEffect(() => {
    const texture = hazeBackground(true);
    scene.background = texture;
    return () => {
      scene.background = null;
      texture.dispose();
    };
  }, [scene]);
  return null;
}

export interface PlaceSceneProps {
  siteId: string;
  terrain: PlaceTerrain;
  site: PlaceSite | null;
  drape: DrapeId;
  exaggeration: number;
  sunAzimuth: number;
  resetToken: number;
  onReady: () => void;
  onFail: () => void;
  onView: (readout: PlaceViewReadout) => void;
}

/** Scene frame: east on +x, north on -z, origin at the window centre, y = 0 under the lowest ground. */
function useSceneFrame(terrain: PlaceTerrain, site: PlaceSite | null) {
  return useMemo(() => {
    const { meta, grid } = terrain;
    const [left, bottom, right, top] = meta.bounds;
    const origin: [number, number] = [(left + right) / 2, (bottom + top) / 2];
    const relief = meta.elevation.max - meta.elevation.min;
    // A plinth under the lowest ground, so flat country still reads as a block.
    const datum = meta.elevation.min - Math.max(40, relief * 0.18);
    const centreHeight = gridHeightAt(grid, origin[0], origin[1]) - datum;
    let marker: PlaceMarker | null = null;
    if (site) {
      const [east, north] = lonLatToMercator(site.longitude, site.latitude);
      marker = { label: site.name, position: [east - origin[0], gridHeightAt(grid, east, north) - datum, origin[1] - north] };
    }
    return { origin, datum, span: right - left, centreHeight, marker };
  }, [terrain, site]);
}

export function PlaceScene(props: PlaceSceneProps) {
  const { meta, grid } = props.terrain;
  const frame = useSceneFrame(props.terrain, props.site);
  const heightScale = verticalScale(props.exaggeration, meta.pixelSizeM, meta.groundPixelSizeM);
  const start = useMemo(() => {
    const aspect = window.innerWidth / window.innerHeight;
    const offset = framingCameraOffset(frame.span, FOV_DEGREES, aspect, CAMERA_AZIMUTH, CAMERA_ELEVATION);
    const target: [number, number, number] = [0, frame.centreHeight * verticalScale(1.5, meta.pixelSizeM, meta.groundPixelSizeM), 0];
    const position: [number, number, number] = [offset[0], offset[1] + target[1], offset[2]];
    return { target, position, distance: Math.hypot(...offset) };
  }, [frame, meta]);
  const groundAt = useCallback(
    (x: number, z: number) => (gridHeightAt(grid, x + frame.origin[0], frame.origin[1] - z) - frame.datum) * heightScale,
    [grid, frame, heightScale],
  );
  return (
    <Canvas
      flat
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ position: start.position, fov: FOV_DEGREES, near: frame.span / 400, far: frame.span * 40 }}
      gl={{ antialias: true, outputColorSpace: THREE.LinearSRGBColorSpace }}
    >
      <Backdrop />
      <DrapeBoundary onFail={props.onFail}>
        <Suspense fallback={null}>
          <PlaceTerrainBlock
            siteId={props.siteId}
            grid={grid}
            origin={frame.origin}
            datum={frame.datum}
            verticalScale={heightScale}
            drape={props.drape}
            sunAzimuth={props.sunAzimuth}
            marker={frame.marker}
            onReady={props.onReady}
          />
        </Suspense>
      </DrapeBoundary>
      <PlaceOrbit
        target={start.target}
        span={frame.span}
        startDistance={start.distance}
        groundAt={groundAt}
        resetToken={props.resetToken}
        pixelSizeM={meta.pixelSizeM}
        groundPixelSizeM={meta.groundPixelSizeM}
        onView={props.onView}
      />
    </Canvas>
  );
}

function PlaceOrbit(props: {
  target: [number, number, number];
  span: number;
  startDistance: number;
  groundAt: (x: number, z: number) => number;
  resetToken: number;
  pixelSizeM: number;
  groundPixelSizeM: number;
  onView: (readout: PlaceViewReadout) => void;
}) {
  const controls = useRef<OrbitControlsImpl>(null);
  const shown = useRef("");
  const reducedMotion = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const { span, groundAt } = props;
  const { camera, size } = useThree();

  // The chrome is heavier at the bottom (much more so on a phone), so the picture sits a little high.
  useEffect(() => {
    const lift = size.width < size.height ? 0.1 : 0.03;
    (camera as THREE.PerspectiveCamera).setViewOffset(size.width, size.height, 0, size.height * lift, size.width, size.height);
  }, [camera, size]);

  // The target is set after construction, so the reset pose is stored once it is in place.
  useEffect(() => controls.current?.saveState(), []);
  useEffect(() => {
    if (props.resetToken > 0) controls.current?.reset();
  }, [props.resetToken]);

  const keepAboveGround = useCallback(() => {
    const orbit = controls.current;
    if (!orbit) return;
    const half = span / 2;
    orbit.target.x = THREE.MathUtils.clamp(orbit.target.x, -half, half);
    orbit.target.z = THREE.MathUtils.clamp(orbit.target.z, -half, half);
    const camera = orbit.object;
    const inside = Math.abs(camera.position.x) < half && Math.abs(camera.position.z) < half;
    const floor = (inside ? groundAt(camera.position.x, camera.position.z) : 0) + span * 0.004;
    if (camera.position.y < floor) camera.position.y = floor;
  }, [span, groundAt]);

  useFrame(({ camera, size }) => {
    const orbit = controls.current;
    if (!orbit) return;
    // Azimuth 0 has the camera south of the target, looking north.
    const heading = Math.round((360 - THREE.MathUtils.radToDeg(orbit.getAzimuthalAngle())) % 360);
    const distance = camera.position.distanceTo(orbit.target);
    const metresPerPixel = groundMetresPerPixel(distance, FOV_DEGREES, size.height, props.pixelSizeM, props.groundPixelSizeM);
    const bar = scaleBarFor(metresPerPixel, SCALE_BAR_MAX_PIXELS);
    const key = `${heading}|${bar.label}|${Math.round(bar.pixels)}`;
    if (key === shown.current) return;
    shown.current = key;
    props.onView({ heading, bar });
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={props.target}
      enableDamping={!reducedMotion}
      dampingFactor={0.12}
      minDistance={span * 0.06}
      maxDistance={Math.max(span * 3, props.startDistance * 1.4)}
      maxPolarAngle={MAX_POLAR}
      onChange={keepAboveGround}
    />
  );
}
