"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, useState, type MutableRefObject, type RefObject } from "react";
import * as THREE from "three";
import { placeCatalogue, type CataloguePin } from "@/lib/cataloguePins";
import {
  ATLAS_FOV_DEGREES,
  CLUSTER_CELL_PX,
  SINGLE_PIN_PX,
  approachDistance,
  clusterByScreen,
  clusterSignature,
  worldSizeForPixels,
  type PinCluster,
  type ScreenPin,
} from "@/lib/pinCluster";
import type { AtlasMetadata } from "@/lib/types";
import type { WikiFeature } from "@/lib/wikidata";

const PIN_CAPACITY = 2048;
const NAME_LIMIT = 12;

interface MarkerView {
  groups: PinCluster[];
  names: PinCluster[];
}

interface HoveredPin {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
}

export function CatalogueMarkers(props: {
  sites: WikiFeature[];
  metadata: AtlasMetadata;
  metres: Float32Array;
  origin: [number, number];
  exaggeration: number;
  labels: boolean;
  onOpen: (siteId: string) => void;
  onApproach: (longitude: number, latitude: number, cameraDistance: number) => void;
}) {
  const placed = useMemo(
    () => placeCatalogue(props.sites, props.metadata, props.metres, props.origin, props.exaggeration),
    [props.sites, props.metadata, props.metres, props.origin, props.exaggeration],
  );
  const screenPins = useMemo(() => placed.map(toScreenPin), [placed]);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const markerArgs = useMemo(
    () => [markerGeometry(), markerMaterial(), PIN_CAPACITY] as [THREE.PlaneGeometry, THREE.MeshBasicMaterial, number],
    [],
  );
  const model = useCatalogueModel(screenPins, props.labels, mesh);
  return (
    <group>
      <instancedMesh
        ref={mesh}
        args={markerArgs}
        frustumCulled={false}
        renderOrder={3}
        userData={{ kind: "catalogue-pins" }}
        onClick={(event) => openSingle(event, model.singles.current, props.onOpen)}
        onPointerMove={(event) => moveHover(event, model.singles.current, model.hovered, model.setHovered)}
        onPointerOut={() => model.setHovered(null)}
      />
      {model.markers.groups.map((group) => (
        <ClusterBadge
          key={group.key}
          group={group}
          onApproach={(longitude, latitude) => {
            props.onApproach(longitude, latitude, approachDistance(model.view.current.distance, group.spanM, model.view.current.fov));
          }}
        />
      ))}
      {model.markers.names.map((pin) => (
        <PinName key={pin.ids[0]} pin={pin} />
      ))}
      {model.hovered ? <PinName pin={model.hovered} /> : null}
    </group>
  );
}

function useCatalogueModel(
  screenPins: ScreenPin[],
  labels: boolean,
  mesh: RefObject<THREE.InstancedMesh | null>,
) {
  const singles = useRef<PinCluster[]>([]);
  const signature = useRef("");
  const scratch = useRef(new THREE.Vector3());
  const view = useRef({ distance: 1, fov: ATLAS_FOV_DEGREES });
  const [markers, setMarkers] = useState<MarkerView>({ groups: [], names: [] });
  const [hovered, setHovered] = useState<HoveredPin | null>(null);
  useLayoutEffect(() => {
    if (mesh.current) mesh.current.count = 0;
  }, [mesh]);
  useFrame((state) => {
    const camera = state.camera;
    const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : ATLAS_FOV_DEGREES;
    const target = (state.controls as { target?: THREE.Vector3 } | null)?.target;
    view.current = {
      distance: target ? camera.position.distanceTo(target) : camera.position.length(),
      fov,
    };
    refreshClusters(screenPins, labels, camera, state.size, scratch.current, signature, singles, setMarkers);
    writeInstances(mesh.current, singles.current, camera, state.size.height, fov);
  });
  return { markers, hovered, setHovered, singles, view };
}

function refreshClusters(
  screenPins: ScreenPin[],
  labels: boolean,
  camera: THREE.Camera,
  size: { width: number; height: number },
  scratch: THREE.Vector3,
  signature: MutableRefObject<string>,
  singles: MutableRefObject<PinCluster[]>,
  setMarkers: (next: MarkerView) => void,
): void {
  projectPins(screenPins, camera, size.width, size.height, scratch);
  const clusters = clusterByScreen(screenPins, CLUSTER_CELL_PX);
  const nextSignature = `${labels ? 1 : 0}|${clusterSignature(clusters)}`;
  if (nextSignature === signature.current) return;
  signature.current = nextSignature;
  const alone = clusters.filter((cluster) => cluster.count === 1);
  singles.current = alone;
  setMarkers({
    groups: clusters.filter((cluster) => cluster.count > 1),
    names: labels && alone.length <= NAME_LIMIT ? alone : [],
  });
}

function openSingle(
  event: { stopPropagation: () => void; instanceId?: number },
  singles: readonly PinCluster[],
  onOpen: (siteId: string) => void,
): void {
  event.stopPropagation();
  const pin = singles[event.instanceId ?? -1];
  if (pin) onOpen(pin.ids[0]);
}

function moveHover(
  event: { stopPropagation: () => void; instanceId?: number },
  singles: readonly PinCluster[],
  hovered: HoveredPin | null,
  setHovered: (pin: HoveredPin | null) => void,
): void {
  event.stopPropagation();
  const pin = singles[event.instanceId ?? -1];
  if (!pin?.name || hovered?.id === pin.ids[0]) return;
  setHovered({ id: pin.ids[0], name: pin.name, x: pin.x, y: pin.y, z: pin.z });
}

function projectPins(
  pins: ScreenPin[],
  camera: THREE.Camera,
  width: number,
  height: number,
  scratch: THREE.Vector3,
): void {
  const margin = CLUSTER_CELL_PX;
  for (const pin of pins) {
    scratch.set(pin.x, pin.y, pin.z).project(camera);
    pin.screenX = (scratch.x * 0.5 + 0.5) * width;
    pin.screenY = (-scratch.y * 0.5 + 0.5) * height;
    pin.visible = scratch.z >= -1 && scratch.z <= 1
      && pin.screenX >= -margin && pin.screenX <= width + margin
      && pin.screenY >= -margin && pin.screenY <= height + margin;
  }
}

function writeInstances(
  mesh: THREE.InstancedMesh | null,
  singles: readonly PinCluster[],
  camera: THREE.Camera,
  viewportHeight: number,
  fov: number,
): void {
  if (!mesh) return;
  const dummy = instanceDummy();
  const count = Math.min(singles.length, PIN_CAPACITY);
  mesh.count = count;
  for (let index = 0; index < count; index += 1) {
    const pin = singles[index];
    const distance = Math.hypot(camera.position.x - pin.x, camera.position.y - pin.y, camera.position.z - pin.z);
    const size = worldSizeForPixels(distance, fov, viewportHeight, SINGLE_PIN_PX);
    dummy.position.set(pin.x, pin.y, pin.z);
    dummy.scale.set(size, size, 1);
    dummy.quaternion.copy(camera.quaternion);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    const color = instanceColor();
    color.set(pin.muted ? "#8a8176" : "#ffffff");
    mesh.setColorAt(index, color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

function ClusterBadge(props: {
  group: PinCluster;
  onApproach: (longitude: number, latitude: number) => void;
}) {
  const { group } = props;
  return (
    <sprite
      position={[group.x, group.y, group.z]}
      scale={[0.024, 0.016, 1]}
      userData={{ kind: "catalogue-cluster", count: group.count }}
      onClick={(event) => {
        event.stopPropagation();
        props.onApproach(group.longitude, group.latitude);
      }}
    >
      <spriteMaterial
        map={countTexture(group.count)}
        depthTest={false}
        sizeAttenuation={false}
        transparent
        opacity={group.muted ? 0.42 : 1}
      />
    </sprite>
  );
}

function PinName(props: { pin: { name: string | null; x: number; y: number; z: number } }) {
  if (!props.pin.name) return null;
  return (
    <Html position={[props.pin.x, props.pin.y, props.pin.z]} center zIndexRange={[4, 0]} style={{ pointerEvents: "none" }}>
      <span className="tip is-shown">{props.pin.name}</span>
    </Html>
  );
}

function toScreenPin(pin: CataloguePin): ScreenPin {
  return { ...pin, screenX: 0, screenY: 0, visible: false };
}

let geometry: THREE.PlaneGeometry | null = null;
let material: THREE.MeshBasicMaterial | null = null;
let dummy: THREE.Object3D | null = null;
let color: THREE.Color | null = null;

function markerGeometry(): THREE.PlaneGeometry {
  geometry ??= new THREE.PlaneGeometry(1, 1);
  return geometry;
}

function markerMaterial(): THREE.MeshBasicMaterial {
  if (material) return material;
  material = new THREE.MeshBasicMaterial({
    map: dotTexture(),
    transparent: true,
    depthTest: false,
    side: THREE.DoubleSide,
    color: "#f4efe6",
  });
  return material;
}

function instanceDummy(): THREE.Object3D {
  dummy ??= new THREE.Object3D();
  return dummy;
}

function instanceColor(): THREE.Color {
  color ??= new THREE.Color();
  return color;
}

function dotTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not draw a catalogue pin");
  context.fillStyle = "#f4efe6";
  context.beginPath();
  context.arc(32, 32, 18, 0, Math.PI * 2);
  context.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

const countTextures = new Map<number, THREE.CanvasTexture>();

function countTexture(count: number): THREE.CanvasTexture {
  const cached = countTextures.get(count);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not draw a cluster count");
  context.clearRect(0, 0, 128, 64);
  context.fillStyle = "rgba(244, 239, 230, 0.94)";
  context.beginPath();
  roundRect(context, 6, 8, 116, 48, 24);
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

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  if (context.roundRect) {
    context.roundRect(x, y, width, height, radius);
    return;
  }
  context.rect(x, y, width, height);
}
