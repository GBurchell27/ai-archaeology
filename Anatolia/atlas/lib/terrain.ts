import * as THREE from "three";

export interface TerrainGrid {
  width: number;
  height: number;
  bounds: [number, number, number, number];
  metres: Float32Array;
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
    throw new Error(`Height grid is ${encoded.length}, expected ${width * height}`);
  }
  const span = highest - lowest;
  const metres = new Float32Array(encoded.length);
  for (let index = 0; index < encoded.length; index += 1) {
    metres[index] = lowest + (encoded[index] / 65535) * span;
  }
  return metres;
}

export function buildTerrainGeometry(
  grid: TerrainGrid,
  origin: [number, number],
  datum: number,
  exaggeration: number,
): THREE.BufferGeometry {
  const { width, height, bounds, metres } = grid;
  const [left, bottom, right, top] = bounds;
  const positions = new Float32Array(width * height * 3);
  const uvs = new Float32Array(width * height * 2);
  const cellWidth = (right - left) / width;
  const cellHeight = (top - bottom) / height;
  for (let row = 0; row < height; row += 1) {
    const north = top - (row + 0.5) * cellHeight;
    const zValue = -(north - origin[1]);
    const vCoord = 1 - (row + 0.5) / height;
    for (let column = 0; column < width; column += 1) {
      const east = left + (column + 0.5) * cellWidth;
      const sample = row * width + column;
      positions[sample * 3] = east - origin[0];
      positions[sample * 3 + 1] = (metres[sample] - datum) * exaggeration;
      positions[sample * 3 + 2] = zValue;
      uvs[sample * 2] = (column + 0.5) / width;
      uvs[sample * 2 + 1] = vCoord;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(buildIndices(width, height));
  geometry.computeVertexNormals();
  if (meanNormalY(geometry) < 0) {
    reverseWinding(geometry);
    geometry.computeVertexNormals();
  }
  geometry.computeBoundingSphere();
  return geometry;
}

function buildIndices(width: number, height: number): THREE.BufferAttribute {
  const indices = new Uint32Array((width - 1) * (height - 1) * 6);
  let offset = 0;
  for (let row = 0; row < height - 1; row += 1) {
    for (let column = 0; column < width - 1; column += 1) {
      const northwest = row * width + column;
      const northeast = northwest + 1;
      const southwest = northwest + width;
      indices[offset] = northwest;
      indices[offset + 1] = southwest;
      indices[offset + 2] = northeast;
      indices[offset + 3] = northeast;
      indices[offset + 4] = southwest;
      indices[offset + 5] = southwest + 1;
      offset += 6;
    }
  }
  return new THREE.BufferAttribute(indices, 1);
}

function reverseWinding(geometry: THREE.BufferGeometry): void {
  const index = geometry.getIndex();
  if (!index) {
    return;
  }
  for (let cursor = 0; cursor < index.count; cursor += 3) {
    const swap = index.getX(cursor + 1);
    index.setX(cursor + 1, index.getX(cursor + 2));
    index.setX(cursor + 2, swap);
  }
  index.needsUpdate = true;
}

function meanNormalY(geometry: THREE.BufferGeometry): number {
  const normals = geometry.getAttribute("normal");
  let sum = 0;
  let samples = 0;
  for (let index = 0; index < normals.count; index += 80) {
    sum += normals.getY(index);
    samples += 1;
  }
  return samples === 0 ? 1 : sum / samples;
}
