import * as THREE from "three";

/** Screen-space haze. The horizon matches the old ground tone; the top is a cool grey. */
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
    gradient.addColorStop(0, "#1c2833");
    gradient.addColorStop(0.5, "#3a4652");
    gradient.addColorStop(1, "#5c5348");
  } else {
    gradient.addColorStop(0, "#7f93a4");
    gradient.addColorStop(0.42, "#a9b4b4");
    gradient.addColorStop(0.72, "#c4b59a");
    gradient.addColorStop(1, "#cbb89a");
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
export const HAZE_STRENGTH = 0.5;
