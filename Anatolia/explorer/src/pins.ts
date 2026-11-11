import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import type { PlacedSite } from "./types";

const KIND_COLOR: Record<PlacedSite["feature"]["properties"]["kind"], string> = {
  validation: "#e07a45",
  published: "#e6c27a",
  submerged: "#8aa0ad",
  landmark: "#7eb0c4",
};

export interface SitePin {
  site: PlacedSite;
  group: THREE.Group;
  sprite: THREE.Sprite;
  pole: THREE.Mesh;
  ring: THREE.Mesh;
  label: CSS2DObject;
}

export function createPins(
  sites: PlacedSite[],
  origin: [number, number],
  datum: number,
  exaggeration: number,
): SitePin[] {
  const marker = circleTexture();
  return sites.map((site) => buildPin(site, origin, datum, exaggeration, marker));
}

export function placePin(pin: SitePin, origin: [number, number], datum: number, exaggeration: number): void {
  const [easting, northing] = pin.site.record.utm;
  const ground = (pin.site.record.groundElevation - datum) * exaggeration;
  pin.group.position.set(easting - origin[0], ground, -(northing - origin[1]));
  const poleHeight = 160 * exaggeration;
  pin.pole.scale.set(1, poleHeight, 1);
  pin.pole.position.y = poleHeight / 2;
  pin.sprite.position.y = poleHeight;
  pin.label.position.set(0, poleHeight + 40, 0);
  pin.ring.position.y = 18;
}

export function setPinLabels(pins: SitePin[], visible: boolean): void {
  for (const pin of pins) {
    pin.label.visible = visible;
  }
}

export function markSelectedPin(pins: SitePin[], selectedId: string | null): void {
  for (const pin of pins) {
    const selected = pin.site.feature.id === selectedId;
    const color = new THREE.Color(KIND_COLOR[pin.site.feature.properties.kind]);
    (pin.sprite.material as THREE.SpriteMaterial).color.copy(color);
    (pin.ring.material as THREE.MeshBasicMaterial).opacity = selected ? 0.95 : 0.55;
  }
}

function buildPin(
  site: PlacedSite,
  origin: [number, number],
  datum: number,
  exaggeration: number,
  marker: THREE.Texture,
): SitePin {
  const group = new THREE.Group();
  group.name = site.feature.id;
  const color = new THREE.Color(KIND_COLOR[site.feature.properties.kind]);
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(18, 18, 1, 8),
    new THREE.MeshBasicMaterial({ color }),
  );
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: marker, color, depthTest: false, transparent: true }),
  );
  sprite.scale.set(520, 520, 1);
  sprite.userData.siteId = site.feature.id;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(150, 230, 40),
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.55 }),
  );
  ring.rotation.x = -Math.PI / 2;
  const labelElement = document.createElement("div");
  labelElement.className = "pin-label";
  labelElement.textContent = site.feature.properties.name;
  const label = new CSS2DObject(labelElement);
  group.add(pole, sprite, ring, label);
  const pin = { site, group, sprite, pole, ring, label };
  placePin(pin, origin, datum, exaggeration);
  return pin;
}

function circleTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not draw the site marker");
  }
  context.fillStyle = "#fff8ee";
  context.beginPath();
  context.arc(32, 32, 22, 0, Math.PI * 2);
  context.fill();
  context.lineWidth = 8;
  context.strokeStyle = "#2a2118";
  context.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}
