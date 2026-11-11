"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { lonLatToMercator, sampleMeshHeight, toLocal } from "@/lib/geo";
import type { AtlasMetadata } from "@/lib/types";
import type { WikiFeature } from "@/lib/wikidata";

const CLUSTER_M = 110000;
const OVERVIEW_M = 170000;

export function WikidataLayer(props: {
  sites: WikiFeature[];
  metadata: AtlasMetadata;
  metres: Float32Array;
  origin: [number, number];
  exaggeration: number;
  onOpen: (siteId: string) => void;
  onApproach: (longitude: number, latitude: number) => void;
}) {
  const [overview, setOverview] = useState(true);
  const [nearby, setNearby] = useState<string[] | null>(null);
  const mode = useRef(true);
  const focus = useRef(new THREE.Vector3());
  const controls = useThree((state) => state.controls) as { target?: THREE.Vector3 } | null;
  useFrame(({ camera }) => {
    const target = controls?.target;
    const distance = target ? camera.position.distanceTo(target) : camera.position.length();
    const next = distance > OVERVIEW_M;
    if (next !== mode.current) {
      mode.current = next;
      setOverview(next);
    }
    if (!next && target && focus.current.distanceTo(target) > 8000) {
      focus.current.copy(target);
      setNearby(placed.filter((site) => Math.hypot(site.x - target.x, site.z - target.z) < 90000).map((site) => site.feature.id));
    }
  });
  const placed = useMemo(
    () => props.sites.map((site) => place(site, props.metadata, props.metres, props.origin, props.exaggeration)),
    [props.sites, props.metadata, props.metres, props.origin, props.exaggeration],
  );
  const clusters = useMemo(() => cluster(placed), [placed]);
  if (overview) {
    return (
      <group>
        {clusters.map((item) => (
          <group key={item.key} position={[item.x, item.y, item.z]}>
            <sprite
              scale={[0.02, 0.012, 1]}
              onClick={(event) => {
                event.stopPropagation();
                props.onApproach(item.longitude, item.latitude);
              }}
            >
              <spriteMaterial map={countTexture(item.count)} depthTest={false} sizeAttenuation={false} />
            </sprite>
          </group>
        ))}
      </group>
    );
  }
  const visible = nearby ? placed.filter((site) => nearby.includes(site.feature.id)) : [];
  return (
    <group>
      {visible.map((site) => (
        <sprite
          key={site.feature.id}
          position={[site.x, site.y, site.z]}
          scale={[0.012, 0.012, 1]}
          onClick={(event) => {
            event.stopPropagation();
            props.onOpen(site.feature.id);
          }}
        >
          <spriteMaterial map={pinTexture()} color="#f3ead8" transparent depthTest={false} sizeAttenuation={false} />
        </sprite>
      ))}
    </group>
  );
}

const countTextures = new Map<number, THREE.CanvasTexture>();

function countTexture(count: number): THREE.CanvasTexture {
  const cached = countTextures.get(count);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("cluster label failed");
  context.clearRect(0, 0, 128, 64);
  context.fillStyle = "rgba(244, 239, 230, 0.92)";
  context.beginPath();
  context.roundRect?.(8, 10, 112, 44, 22);
  if (!context.roundRect) context.rect(8, 10, 112, 44);
  context.fill();
  context.fillStyle = "#1b140f";
  context.font = "600 28px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(String(count), 64, 34);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  countTextures.set(count, texture);
  return texture;
}

let pin: THREE.CanvasTexture | null = null;

function pinTexture(): THREE.CanvasTexture {
  if (pin) return pin;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("pin texture failed");
  context.fillStyle = "#f4efe6";
  context.beginPath();
  context.arc(32, 32, 14, 0, Math.PI * 2);
  context.fill();
  pin = new THREE.CanvasTexture(canvas);
  pin.colorSpace = THREE.NoColorSpace;
  return pin;
}

function place(
  feature: WikiFeature,
  metadata: AtlasMetadata,
  metres: Float32Array,
  origin: [number, number],
  exaggeration: number,
) {
  const [longitude, latitude] = feature.geometry.coordinates;
  const [east, north] = lonLatToMercator(longitude, latitude);
  const elevation = sampleMeshHeight(metres, metadata.width, metadata.height, metadata.bounds, east, north);
  const [xCoord, zCoord] = toLocal(longitude, latitude, origin);
  return {
    feature,
    longitude,
    latitude,
    x: xCoord,
    y: (elevation - metadata.elevation.min) * exaggeration + 30,
    z: zCoord,
  };
}

function cluster(sites: ReturnType<typeof place>[]) {
  const bins = new Map<string, { key: string; x: number; y: number; z: number; longitude: number; latitude: number; count: number }>();
  for (const site of sites) {
    const key = `${Math.round(site.x / CLUSTER_M)}:${Math.round(site.z / CLUSTER_M)}`;
    const current = bins.get(key);
    if (!current) {
      bins.set(key, { key, x: site.x, y: site.y, z: site.z, longitude: site.longitude, latitude: site.latitude, count: 1 });
      continue;
    }
    current.x += site.x;
    current.y += site.y;
    current.z += site.z;
    current.longitude += site.longitude;
    current.latitude += site.latitude;
    current.count += 1;
  }
  return [...bins.values()].map((item) => ({
    ...item,
    x: item.x / item.count,
    y: item.y / item.count,
    z: item.z / item.count,
    longitude: item.longitude / item.count,
    latitude: item.latitude / item.count,
  }));
}
