import * as THREE from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";

export interface CameraPose {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export function overviewPose(span: number): CameraPose {
  return {
    position: new THREE.Vector3(-span * 0.05, span * 0.34, span * 0.5),
    target: new THREE.Vector3(0, span * 0.008, -span * 0.02),
  };
}

export function sitePose(ground: THREE.Vector3): CameraPose {
  return {
    position: ground.clone().add(new THREE.Vector3(500, 1900, 2800)),
    target: ground.clone().add(new THREE.Vector3(0, 60, 0)),
  };
}

let flightToken = 0;

export function flyTo(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  pose: CameraPose,
  durationMs: number,
  onDone: () => void,
): void {
  const startPosition = camera.position.clone();
  const startTarget = controls.target.clone();
  const started = performance.now();
  const token = ++flightToken;
  controls.enabled = false;
  document.body.dataset.flying = "true";

  const step = (now: number) => {
    if (token !== flightToken) {
      return;
    }
    const progress = Math.min(1, (now - started) / durationMs);
    const eased = progress < 0.5 ? 2 * progress * progress : 1 - ((-2 * progress + 2) ** 2) / 2;
    camera.position.lerpVectors(startPosition, pose.position, eased);
    controls.target.lerpVectors(startTarget, pose.target, eased);
    if (progress < 1) {
      requestAnimationFrame(step);
      return;
    }
    controls.enabled = true;
    controls.update();
    document.body.dataset.flying = "false";
    onDone();
  };
  requestAnimationFrame(step);
}
