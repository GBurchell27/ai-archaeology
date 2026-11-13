"use client";

import type { ReactNode } from "react";
import type { TravelMode } from "@/lib/trip/tripTypes";

/**
 * Toy vehicles about one unit long, nose along +Z. The layer scales them to a fixed screen size
 * and draws them over the terrain, so parts are listed from underside to top.
 */

const RENDER_ORDER = 11;

function Part(props: { size: [number, number, number]; position?: [number, number, number]; color: string }) {
  return (
    <mesh position={props.position ?? [0, 0, 0]} renderOrder={RENDER_ORDER}>
      <boxGeometry args={props.size} />
      <meshBasicMaterial color={props.color} depthTest={false} depthWrite={false} />
    </mesh>
  );
}

function PlaneModel() {
  return (
    <group>
      <Part size={[0.17, 0.15, 1]} color="#f7f3ea" />
      <Part size={[1.05, 0.04, 0.24]} position={[0, 0.02, 0.06]} color="#f4a340" />
      <Part size={[0.42, 0.04, 0.13]} position={[0, 0.04, -0.42]} color="#f4a340" />
      <Part size={[0.04, 0.24, 0.16]} position={[0, 0.16, -0.42]} color="#e5462f" />
      <Part size={[0.12, 0.06, 0.1]} position={[0, 0.06, 0.46]} color="#2d3b45" />
    </group>
  );
}

function CarModel() {
  const wheels: [number, number, number][] = [[-0.27, -0.06, 0.3], [0.27, -0.06, 0.3], [-0.27, -0.06, -0.3], [0.27, -0.06, -0.3]];
  return (
    <group>
      {wheels.map((position) => <Part key={position.join(",")} size={[0.1, 0.16, 0.2]} position={position} color="#1d1a17" />)}
      <Part size={[0.5, 0.2, 1]} color="#d8452f" />
      <Part size={[0.44, 0.17, 0.5]} position={[0, 0.18, -0.06]} color="#2d3b45" />
      <Part size={[0.4, 0.03, 0.44]} position={[0, 0.28, -0.06]} color="#e8634d" />
      <Part size={[0.38, 0.05, 0.04]} position={[0, 0.06, 0.5]} color="#fff3c4" />
    </group>
  );
}

function WalkerModel() {
  return (
    <group>
      <Part size={[0.32, 0.5, 0.22]} position={[0, 0.25, 0]} color="#3d6a8a" />
      <Part size={[0.24, 0.24, 0.24]} position={[0, 0.65, 0]} color="#f0c9a0" />
      <Part size={[0.1, 0.04, 0.14]} position={[0, 0.65, 0.16]} color="#3d6a8a" />
    </group>
  );
}

const MODELS: Record<TravelMode, () => ReactNode> = {
  flight: PlaneModel,
  drive: CarModel,
  walk: WalkerModel,
};

export function ToyVehicle({ mode }: { mode: TravelMode }) {
  const Model = MODELS[mode];
  return <Model />;
}
