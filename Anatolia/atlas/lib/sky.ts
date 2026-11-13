import * as THREE from "three";

/** A subdued map background shared by the canvas and the terrain boundary. */
export function hazeBackground(night = false): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not paint the sky");
  }
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  if (night) {
    gradient.addColorStop(0, "#101820");
    gradient.addColorStop(1, "#263641");
  } else {
    gradient.addColorStop(0, "#26383d");
    gradient.addColorStop(1, "#425454");
  }
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.flipY = false;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

export const HAZE_NEAR = 520000;
export const HAZE_FAR = 1450000;
export const HAZE_STRENGTH = 0.12;
