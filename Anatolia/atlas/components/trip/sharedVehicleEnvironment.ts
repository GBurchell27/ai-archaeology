import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const environments = new WeakMap<THREE.WebGLRenderer, THREE.Texture>();

/** A procedural studio reflection, so metallic paint does not render black. Made once per renderer. */
export function sharedVehicleEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  let environment = environments.get(renderer);
  if (!environment) {
    const generator = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    environment = generator.fromScene(room, 0.04).texture;
    room.dispose();
    generator.dispose();
    environments.set(renderer, environment);
  }
  return environment;
}
