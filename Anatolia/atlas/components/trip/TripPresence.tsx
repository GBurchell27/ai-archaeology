"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { TripVehicle } from "@/components/trip/TripVehicle";
import { useCameraFollow } from "@/components/trip/useCameraFollow";
import { ATLAS_FOV_DEGREES, worldSizeForPixels } from "@/lib/pinCluster";
import { poseAlong, type Point3, type RouteSurface } from "@/lib/trip/tripRoute";
import type { TripLocation } from "@/lib/trip/tripTimeline";
import type { TravelMode } from "@/lib/trip/tripTypes";
import type { PlannedRoute } from "@/components/trip/TripRouteLines";

const VEHICLE_PX = 44;
const HALO_PX = 70;
const STAY_MARKER_PX = 22;

interface Presence {
  position: Point3;
  direction: Point3;
  /** Ground point under the traveller, which the camera follows. */
  focus: Point3;
  mode: TravelMode | null;
  label: string;
}

/** The traveller right now: a vehicle on the move, or a marker where they are staying. */
export function TripPresence(props: {
  location: TripLocation;
  routes: Map<number, PlannedRoute>;
  surface: RouteSurface;
  follow: boolean;
  onFollowInterrupt: () => void;
}) {
  const presence = presenceAt(props.location, props.routes, props.surface);
  const latest = useRef(presence);
  latest.current = presence;
  const focus = useRef(new THREE.Vector3(...presence.focus));
  focus.current.set(...presence.focus);
  const anchor = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const viewportHeight = useThree((state) => state.size.height);
  const textures = useMemo(() => ({ halo: paintHalo(), ring: paintRing() }), []);
  useEffect(() => () => {
    textures.halo.dispose();
    textures.ring.dispose();
  }, [textures]);
  useCameraFollow(focus, props.follow, props.onFollowInterrupt);

  useFrame(({ camera }) => {
    const group = anchor.current;
    if (!group) return;
    const { position, direction } = latest.current;
    group.position.set(...position);
    group.updateMatrixWorld();
    if (!body.current) return;
    const distance = camera.position.distanceTo(group.position);
    body.current.scale.setScalar(worldSizeForPixels(distance, ATLAS_FOV_DEGREES, viewportHeight, VEHICLE_PX));
    const flat = latest.current.mode !== "flight";
    const ahead = new THREE.Vector3(direction[0], flat ? 0 : direction[1], direction[2]);
    if (ahead.lengthSq() > 1e-8) body.current.lookAt(ahead.normalize().multiplyScalar(1000).add(group.position));
  });

  const spriteSize = (pixels: number) => worldSizeForPixels(1, ATLAS_FOV_DEGREES, viewportHeight, pixels);
  return (
    <group ref={anchor} position={presence.position}>
      <sprite scale={[spriteSize(HALO_PX), spriteSize(HALO_PX), 1]} renderOrder={10}>
        <spriteMaterial map={textures.halo} transparent depthTest={false} depthWrite={false} sizeAttenuation={false} />
      </sprite>
      {presence.mode ? (
        <group ref={body}>
          <TripVehicle mode={presence.mode} />
        </group>
      ) : (
        <>
          <sprite scale={[spriteSize(STAY_MARKER_PX), spriteSize(STAY_MARKER_PX), 1]} renderOrder={11}>
            <spriteMaterial map={textures.ring} transparent depthTest={false} depthWrite={false} sizeAttenuation={false} />
          </sprite>
          <Html center zIndexRange={[4, 0]} style={{ pointerEvents: "none" }}>
            <span className="tip is-shown site-pin-label">{presence.label}</span>
          </Html>
        </>
      )}
    </group>
  );
}

function presenceAt(location: TripLocation, routes: Map<number, PlannedRoute>, surface: RouteSurface): Presence {
  const { segment, index } = location.timed;
  const planned = routes.get(index);
  if (segment.kind === "stay" || !planned) {
    const place = segment.kind === "stay" ? segment.place : segment.to;
    const [x, z] = surface.toLocal(place.position);
    const point: Point3 = [x, surface.groundY(place.position), z];
    return { position: point, direction: [0, 0, -1], focus: point, mode: null, label: place.name };
  }
  const pose = poseAlong(planned.route, location.progress);
  const [first, last] = [planned.route.points[0], planned.route.points[planned.route.points.length - 1]];
  const groundY = first[1] + (last[1] - first[1]) * location.progress;
  const focus: Point3 = segment.mode === "flight" ? [pose.position[0], groundY, pose.position[2]] : pose.position;
  return { ...pose, focus, mode: segment.mode, label: segment.title };
}

function paintHalo(): THREE.CanvasTexture {
  return paint((context) => {
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(20, 15, 10, 0.55)");
    gradient.addColorStop(1, "rgba(20, 15, 10, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
  });
}

function paintRing(): THREE.CanvasTexture {
  return paint((context) => {
    context.beginPath();
    context.arc(32, 32, 22, 0, Math.PI * 2);
    context.fillStyle = "#f4a340";
    context.fill();
    context.lineWidth = 7;
    context.strokeStyle = "#fbf4e7";
    context.stroke();
  });
}

function paint(draw: (context: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not draw a trip marker");
  draw(context);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}
