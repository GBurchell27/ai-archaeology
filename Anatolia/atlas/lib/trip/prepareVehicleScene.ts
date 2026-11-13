import * as THREE from "three";
import type { VehicleModelSource } from "@/lib/trip/tripVehicleCatalog";

/** Vehicles draw after a depth clear, so they show over the terrain but still hide their own far side. */
export const VEHICLE_RENDER_ORDER = 1000;
const GLASS_OPACITY = 0.7;

interface MaterialSetup {
  paint?: VehicleModelSource["paint"];
  environment?: THREE.Texture;
}

/** A copy of a loaded model, one unit across its largest side, with materials set up to draw over the map. */
export function prepareVehicleScene(scene: THREE.Object3D, source: VehicleModelSource, environment?: THREE.Texture): THREE.Group {
  const model = scene.clone(true);
  const setup: MaterialSetup = { paint: source.paint, environment };
  const prepare = (material: THREE.Material) => overlayMaterial(material, setup);
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    node.renderOrder = VEHICLE_RENDER_ORDER;
    node.frustumCulled = false;
    node.material = Array.isArray(node.material) ? node.material.map(prepare) : prepare(node.material);
  });
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  model.position.sub(new THREE.Vector3(centre.x, source.rest === "base" ? box.min.y : centre.y, centre.z));
  const normalised = new THREE.Group();
  normalised.add(model);
  normalised.scale.setScalar(1 / Math.max(size.x, size.y, size.z, 1e-6));
  return normalised;
}

export function disposeVehicleMaterials(root: THREE.Object3D): void {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    for (const material of [node.material].flat()) material.dispose();
  });
}

function overlayMaterial(material: THREE.Material, setup: MaterialSetup): THREE.Material {
  const copy = material.clone();
  if (copy instanceof THREE.MeshStandardMaterial) {
    if (setup.environment) copy.envMap = setup.environment;
    if (setup.paint?.materials.includes(copy.name)) copy.color.set(setup.paint.color);
  }
  if (copy instanceof THREE.MeshPhysicalMaterial && copy.transmission > 0) {
    copy.transmission = 0;
    copy.opacity = Math.min(copy.opacity, GLASS_OPACITY);
  }
  copy.transparent = true;
  copy.depthTest = true;
  copy.depthWrite = true;
  return copy;
}
