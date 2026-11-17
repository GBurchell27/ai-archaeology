"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import {
  WGS84_EQUATORIAL_RADIUS,
  greatCircleAngle,
  interpolateGreatCircle,
  lonLatHeightToScene,
  sceneToLonLatHeight,
  type GlobeLook,
} from "@/lib/globe/ellipsoid";

export interface GlobeFlyTo extends GlobeLook {
  /** Change it to fly again, even to the same place. */
  token: number;
}

interface ActiveFlight {
  started: number;
  duration: number;
  from: GlobeLook;
  to: GlobeLook;
  fromOrientation: THREE.Quaternion;
  lift: number;
}

const NORTH_AXIS = new THREE.Vector3(0, 0, 1);
const IDLE_DEGREES_PER_SECOND = 1.1;
const ORIENTATION_BLEND = 0.3;
const idleTurn = new THREE.Quaternion();

/** Puts the camera straight above a place, north up. */
export function placeCameraAbove(camera: THREE.Camera, look: GlobeLook): void {
  // lookAt has no answer exactly over a pole, where "north up" stops meaning anything.
  const latitude = THREE.MathUtils.clamp(look.latitude, -89.5, 89.5);
  camera.position.set(...lonLatHeightToScene(look.longitude, latitude, look.altitude));
  camera.up.copy(NORTH_AXIS);
  camera.lookAt(...lonLatHeightToScene(look.longitude, latitude, 0));
  camera.updateMatrixWorld();
}

function planFlight(camera: THREE.Camera, to: GlobeLook, instant: boolean): ActiveFlight {
  const here = sceneToLonLatHeight(camera.position.toArray());
  const from = { longitude: here.longitude, latitude: here.latitude, altitude: Math.max(here.height, 1) };
  const angle = greatCircleAngle(from, to);
  const highest = Math.max(from.altitude, to.altitude);
  // Long hops climb so the whole arc is in view mid-flight; short ones stay level.
  const lift = Math.max(0, Math.log(Math.max(highest, angle * WGS84_EQUATORIAL_RADIUS * 0.6) / highest));
  const duration = instant ? 0 : THREE.MathUtils.clamp(
    900 + angle * 1300 + Math.abs(Math.log(to.altitude / from.altitude)) * 260, 900, 3400,
  );
  return { started: performance.now(), duration, from, to, fromOrientation: camera.quaternion.clone(), lift };
}

function stepFlight(camera: THREE.Camera, flight: ActiveFlight): boolean {
  const progress = flight.duration === 0 ? 1 : Math.min(1, (performance.now() - flight.started) / flight.duration);
  const eased = progress * progress * progress * (progress * (progress * 6 - 15) + 10);
  const arc = 16 * eased * eased * (1 - eased) * (1 - eased) * flight.lift;
  const logAltitude = THREE.MathUtils.lerp(Math.log(flight.from.altitude), Math.log(flight.to.altitude), eased);
  placeCameraAbove(camera, {
    ...interpolateGreatCircle(flight.from, flight.to, eased),
    altitude: Math.exp(logAltitude + arc),
  });
  // A tilted starting view eases into the top-down one instead of snapping.
  if (eased < ORIENTATION_BLEND) {
    camera.quaternion.slerpQuaternions(flight.fromOrientation, camera.quaternion.clone(), eased / ORIENTATION_BLEND);
  }
  return progress === 1;
}

/**
 * Scripted camera motion: the opening pose, a slow idle turn until the first input,
 * and fly-to. Any pointer or wheel input on the canvas takes the camera back.
 */
export function GlobeFlight(props: { initialLook: GlobeLook; flyTo?: GlobeFlyTo | null; idleSpin: boolean }) {
  const camera = useThree((state) => state.camera);
  const canvas = useThree((state) => state.gl.domElement);
  const flight = useRef<ActiveFlight | null>(null);
  const idle = useRef(props.idleSpin);
  const reduced = useRef(false);
  const opening = useRef(props.initialLook);

  useLayoutEffect(() => placeCameraAbove(camera, opening.current), [camera]);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => { reduced.current = motion.matches; };
    syncMotion();
    motion.addEventListener("change", syncMotion);
    return () => motion.removeEventListener("change", syncMotion);
  }, []);

  useEffect(() => {
    function takeOver() {
      idle.current = false;
      flight.current = null;
      document.body.dataset.flying = "false";
    }
    canvas.addEventListener("pointerdown", takeOver, true);
    canvas.addEventListener("wheel", takeOver, { capture: true, passive: true });
    return () => {
      canvas.removeEventListener("pointerdown", takeOver, true);
      canvas.removeEventListener("wheel", takeOver, true);
      document.body.dataset.flying = "false";
    };
  }, [canvas]);

  const { flyTo } = props;
  useEffect(() => {
    if (!flyTo) return;
    idle.current = false;
    flight.current = planFlight(camera, flyTo, reduced.current);
    document.body.dataset.flying = "true";
  }, [camera, flyTo]);

  // After the controls (priority -1) so a flight frame is not nudged by leftover drag inertia.
  useFrame((_, delta) => {
    if (flight.current) {
      if (stepFlight(camera, flight.current)) {
        flight.current = null;
        document.body.dataset.flying = "false";
      }
    } else if (idle.current && !reduced.current) {
      const turn = -THREE.MathUtils.degToRad(IDLE_DEGREES_PER_SECOND) * Math.min(delta, 0.1);
      camera.position.applyAxisAngle(NORTH_AXIS, turn);
      camera.quaternion.premultiply(idleTurn.setFromAxisAngle(NORTH_AXIS, turn));
    }
  }, -0.5);

  return null;
}
