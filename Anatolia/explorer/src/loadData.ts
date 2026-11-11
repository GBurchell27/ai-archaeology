import * as THREE from "three";
import type { SiteCollection, TerrainMetadata } from "./types";

const textureLoader = new THREE.TextureLoader();
const textureCache = new Map<string, Promise<THREE.Texture>>();

export function assetUrl(relativePath: string): string {
  const root = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${root}terrain/${relativePath}`;
}

export async function loadMetadata(): Promise<TerrainMetadata> {
  const response = await fetch(assetUrl("metadata.json"));
  if (!response.ok) {
    throw new Error("Terrain metadata is missing. Run the data build first.");
  }
  return response.json() as Promise<TerrainMetadata>;
}

export async function loadSites(): Promise<SiteCollection> {
  const root = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  const response = await fetch(`${root}sites.geojson`);
  if (!response.ok) {
    throw new Error("sites.geojson failed to load");
  }
  return response.json() as Promise<SiteCollection>;
}

export function decodeHeight(
  buffer: ArrayBuffer,
  width: number,
  height: number,
  lowest: number,
  highest: number,
): Float32Array {
  const encoded = new Uint16Array(buffer);
  if (encoded.length !== width * height) {
    throw new Error(`Height grid is ${encoded.length} samples, expected ${width * height}`);
  }
  const span = highest - lowest;
  const metres = new Float32Array(encoded.length);
  for (let index = 0; index < encoded.length; index += 1) {
    metres[index] = lowest + (encoded[index] / 65535) * span;
  }
  return metres;
}

export async function loadHeight(
  relativePath: string,
  width: number,
  height: number,
  lowest: number,
  highest: number,
): Promise<Float32Array> {
  const response = await fetch(assetUrl(relativePath));
  if (!response.ok) {
    throw new Error(`Missing height grid ${relativePath}`);
  }
  return decodeHeight(await response.arrayBuffer(), width, height, lowest, highest);
}

export function loadTexture(relativePath: string): Promise<THREE.Texture> {
  const url = assetUrl(relativePath);
  const cached = textureCache.get(url);
  if (cached) {
    return cached;
  }
  const pending = new Promise<THREE.Texture>((resolve, reject) => {
    textureLoader.load(
      url,
      (texture) => {
        texture.colorSpace = THREE.NoColorSpace;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.flipY = true;
        resolve(texture);
      },
      undefined,
      () => reject(new Error(`Texture failed: ${relativePath}`)),
    );
  });
  textureCache.set(url, pending);
  return pending;
}
