"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

export interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
  token: number;
}

export interface ZoomCommand {
  steps: number;
  token: number;
}

interface Flight {
  started: number;
  duration: number;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  from: THREE.Spherical;
  to: THREE.Spherical;
  lift: number;
}

const MIN_DISTANCE = 240;
const MOUSE = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
const TOUCH = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
const SCALES = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000];

export function AtlasCamera(props: {
  pose: CameraPose;
  span: number;
  originY: number;
  readoutRef: RefObject<HTMLDivElement | null>;
  cancelToken: number;
  zoomSpeed: number;
  zoomCommand: ZoomCommand;
  onArrival: () => void;
  groundAt: (x: number, z: number) => number | null;
}) {
  const { pose, span, cancelToken, zoomSpeed, zoomCommand, onArrival } = props;
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const scene = useThree((state) => state.scene);
  const canvas = useThree((state) => state.gl.domElement);
  const flight = useRef<Flight | null>(null);
  const zoom = useRef({ remaining: 0, anchor: new THREE.Vector3() });
  const reduced = useRef(false);
  const scratch = useMemo(() => ({
    offset: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    angles: new THREE.Spherical(),
    cursor: new THREE.Vector2(),
    ray: new THREE.Raycaster(),
    plane: new THREE.Plane(new THREE.Vector3(0, 1, 0)),
    readoutTime: 0,
  }), []);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => { reduced.current = motion.matches; };
    syncMotion();
    motion.addEventListener("change", syncMotion);
    return () => motion.removeEventListener("change", syncMotion);
  }, []);

  useEffect(() => {
    const orbit = controls.current;
    if (!orbit) return;
    zoom.current.remaining = 0;
    orbit.enableDamping = false;
    orbit.update();
    if (pose.token === 0) {
      orbit.target.set(...pose.target);
      camera.position.set(...pose.position);
      orbit.update();
      finishFlight(orbit);
      return;
    }
    const fromTarget = orbit.target.clone();
    const toTarget = new THREE.Vector3(...pose.target);
    const from = new THREE.Spherical().setFromVector3(camera.position.clone().sub(fromTarget));
    const to = new THREE.Spherical().setFromVector3(new THREE.Vector3(...pose.position).sub(toTarget));
    to.theta = from.theta + Math.atan2(Math.sin(to.theta - from.theta), Math.cos(to.theta - from.theta));
    const travel = fromTarget.distanceTo(toTarget);
    const duration = reduced.current ? 0 : THREE.MathUtils.clamp(
      620 + Math.abs(Math.log(to.radius / from.radius)) * 135 + travel / 2100, 620, 1950,
    );
    const lift = Math.max(0, Math.log(Math.max(from.radius, to.radius, travel * 0.32) / Math.max(from.radius, to.radius)));
    flight.current = { started: performance.now(), duration, fromTarget, toTarget, from, to, lift };
    orbit.enabled = false;
    document.body.dataset.flying = "true";
    document.body.dataset.flightMs = String(Math.round(duration));
  }, [camera, pose]);

  useEffect(() => {
    if (!cancelToken || !controls.current) return;
    flight.current = null;
    zoom.current.remaining = 0;
    finishFlight(controls.current);
  }, [cancelToken]);

  useEffect(() => {
    function interrupt() {
      const orbit = controls.current;
      if (!orbit) return;
      zoom.current.remaining = 0;
      if (!flight.current) return;
      flight.current = null;
      finishFlight(orbit);
      onArrival();
    }
    function wheel(event: WheelEvent) {
      const orbit = controls.current;
      if (!orbit || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (flight.current) interrupt();
      const rect = canvas.getBoundingClientRect();
      scratch.cursor.set(2 * (event.clientX - rect.left) / rect.width - 1, 1 - 2 * (event.clientY - rect.top) / rect.height);
      scratch.ray.setFromCamera(scratch.cursor, camera);
      scratch.plane.constant = -orbit.target.y;
      const { anchor } = zoom.current;
      const hit = scratch.ray.ray.intersectPlane(scratch.plane, anchor);
      const radius = camera.position.distanceTo(orbit.target);
      if (!hit || hit.distanceTo(orbit.target) > radius * 1.4) anchor.copy(orbit.target);
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1;
      queueZoom(orbit, camera, zoom.current, THREE.MathUtils.clamp(event.deltaY * unit, -240, 240) * 0.0028 * zoomSpeed);
    }
    canvas.addEventListener("wheel", wheel, { capture: true, passive: false });
    canvas.addEventListener("pointerdown", interrupt, true);
    return () => {
      canvas.removeEventListener("wheel", wheel, true);
      canvas.removeEventListener("pointerdown", interrupt, true);
    };
  }, [camera, canvas, scratch, zoomSpeed, onArrival]);

  useEffect(() => {
    const orbit = controls.current;
    if (!zoomCommand.token || !orbit) return;
    if (flight.current) {
      flight.current = null;
      finishFlight(orbit);
      onArrival();
    }
    zoom.current.anchor.copy(orbit.target);
    queueZoom(orbit, camera, zoom.current, zoomCommand.steps * 0.42);
  }, [camera, zoomCommand, onArrival]);

  useEffect(() => {
    const debug = window as Window & {
      __atlasCamera?: THREE.Camera;
      __atlasControls?: OrbitControlsImpl | null;
      __atlasScene?: THREE.Scene;
    };
    debug.__atlasCamera = camera;
    debug.__atlasControls = controls.current;
    debug.__atlasScene = scene;
  }, [camera, scene]);

  useFrame((_, delta) => {
    if (controls.current) controls.current.dampingFactor = 1 - Math.exp(-11 * Math.min(delta, 0.14));
  }, -2);

  useFrame(({ size }, delta) => {
    const orbit = controls.current;
    if (!orbit) return;
    const active = flight.current;
    const scroll = zoom.current;
    if (active) {
      const progress = active.duration === 0 ? 1 : Math.min(1, (performance.now() - active.started) / active.duration);
      const t = progress * progress * progress * (progress * (progress * 6 - 15) + 10);
      const { from, to } = active;
      const logRadius = THREE.MathUtils.lerp(Math.log(from.radius), Math.log(to.radius), t);
      const arc = 16 * t * t * (1 - t) * (1 - t) * active.lift;
      scratch.angles.set(
        Math.exp(logRadius + arc),
        THREE.MathUtils.lerp(from.phi, to.phi, t),
        THREE.MathUtils.lerp(from.theta, to.theta, t),
      );
      orbit.target.lerpVectors(active.fromTarget, active.toTarget, t);
      camera.position.copy(orbit.target).add(scratch.offset.setFromSpherical(scratch.angles));
      if (progress === 1) {
        flight.current = null;
        finishFlight(orbit);
        onArrival();
      }
    } else if (scroll.remaining !== 0) {
      const step = reduced.current || Math.abs(scroll.remaining) < 0.001
        ? scroll.remaining
        : scroll.remaining * (1 - Math.exp(-15 * delta));
      scroll.remaining -= step;
      const toward = 1 - Math.exp(step);
      camera.position.lerp(scroll.anchor, toward);
      orbit.target.lerp(scroll.anchor, toward);
    }
    const floor = props.groundAt(camera.position.x, camera.position.z);
    const clearance = floor != null && camera.position.y < floor + 55;
    if (clearance) camera.position.y = floor + 55;
    if (active || scroll.remaining || clearance) camera.lookAt(orbit.target);
    const radius = camera.position.distanceTo(orbit.target);
    const near = Math.max(5, radius * 0.00022);
    if (Math.abs(camera.near - near) > camera.near * 0.08) {
      camera.near = near;
      camera.updateProjectionMatrix();
    }
    if (performance.now() >= scratch.readoutTime) {
      scratch.readoutTime = performance.now() + 100;
      writeReadout(props.readoutRef.current, camera, orbit.target, props.originY, size.height, scratch.direction);
    }
  }, -0.5);

  return (
    <OrbitControls
      ref={controls}
      domElement={canvas}
      makeDefault
      enableDamping
      dampingFactor={0.16}
      zoomSpeed={1.15}
      panSpeed={0.95}
      rotateSpeed={0.62}
      mouseButtons={MOUSE}
      touches={TOUCH}
      screenSpacePanning={false}
      maxPolarAngle={Math.PI / 2 - 0.05}
      minDistance={MIN_DISTANCE}
      maxDistance={span * 4.6}
    />
  );
}

function finishFlight(orbit: OrbitControlsImpl) {
  orbit.enabled = true;
  orbit.enableDamping = true;
  document.body.dataset.flying = "false";
}

function queueZoom(orbit: OrbitControlsImpl, camera: THREE.Camera, zoom: { remaining: number }, change: number) {
  const radius = camera.position.distanceTo(orbit.target);
  const next = THREE.MathUtils.clamp(radius * Math.exp(zoom.remaining + change), orbit.minDistance, orbit.maxDistance);
  zoom.remaining = Math.log(next / radius);
}

function writeReadout(
  element: HTMLDivElement | null,
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  originY: number,
  viewportHeight: number,
  north: THREE.Vector3,
) {
  if (!element || !viewportHeight) return;
  camera.updateMatrixWorld();
  const distance = camera.position.distanceTo(target);
  north.copy(target);
  north.z -= Math.min(2000, distance * 0.08);
  north.project(camera);
  const heading = Math.atan2(north.x * camera.aspect, north.y);
  const latitude = Math.atan(Math.sinh((originY - target.z) / 6378137));
  const metresPerPixel = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.cos(latitude) / viewportHeight;
  let chosen = SCALES[0];
  for (const scale of SCALES) {
    if (scale / metresPerPixel <= 108) chosen = scale;
  }
  const bar = element.querySelector<HTMLElement>("[data-role='scale-bar']");
  const label = element.querySelector("[data-role='scale-label']");
  const arrow = element.querySelector<HTMLElement>("[data-role='north']");
  if (bar) bar.style.width = `${Math.min(140, chosen / metresPerPixel)}px`;
  const text = chosen >= 1000 ? `${chosen / 1000} km` : `${chosen} m`;
  if (label && label.textContent !== text) label.textContent = text;
  if (arrow) arrow.style.transform = `rotate(${heading}rad)`;
  if (element.dataset.on !== "true") element.dataset.on = "true";
}
