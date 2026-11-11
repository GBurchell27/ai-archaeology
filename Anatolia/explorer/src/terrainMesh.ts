import * as THREE from "three";

export interface TerrainGrid {
  width: number;
  height: number;
  bounds: [number, number, number, number];
  metres: Float32Array;
}

const HYPSO_STOPS: Array<[number, [number, number, number]]> = [
  [0.0, [0.42, 0.5, 0.4]],
  [0.22, [0.62, 0.5, 0.32]],
  [0.5, [0.74, 0.6, 0.42]],
  [0.78, [0.8, 0.72, 0.58]],
  [1.0, [0.92, 0.88, 0.8]],
];

export function buildTerrainGeometry(
  grid: TerrainGrid,
  origin: [number, number],
  datum: number,
  exaggeration: number,
  colorRange: { min: number; max: number },
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const count = grid.width * grid.height;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  writeSurface(grid, origin, datum, exaggeration, colorRange, positions, colors, uvs);
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("tint", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(buildIndices(grid.width, grid.height));
  geometry.computeVertexNormals();
  if (meanNormalY(geometry) < 0) {
    reverseWinding(geometry);
    geometry.computeVertexNormals();
  }
  geometry.computeBoundingSphere();
  return geometry;
}

export function applyExaggeration(
  geometry: THREE.BufferGeometry,
  grid: TerrainGrid,
  datum: number,
  exaggeration: number,
): void {
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  for (let index = 0; index < grid.metres.length; index += 1) {
    position.setY(index, (grid.metres[index] - datum) * exaggeration);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
}

function writeSurface(
  grid: TerrainGrid,
  origin: [number, number],
  datum: number,
  exaggeration: number,
  colorRange: { min: number; max: number },
  positions: Float32Array,
  colors: Float32Array,
  uvs: Float32Array,
): void {
  const [left, bottom, right, top] = grid.bounds;
  const cellWidth = (right - left) / grid.width;
  const cellHeight = (top - bottom) / grid.height;
  const colorSpan = Math.max(colorRange.max - colorRange.min, 1);
  for (let row = 0; row < grid.height; row += 1) {
    const north = top - (row + 0.5) * cellHeight;
    const z = -(north - origin[1]);
    const v = 1 - (row + 0.5) / grid.height;
    for (let column = 0; column < grid.width; column += 1) {
      const east = left + (column + 0.5) * cellWidth;
      const sample = row * grid.width + column;
      positions[sample * 3] = east - origin[0];
      positions[sample * 3 + 1] = (grid.metres[sample] - datum) * exaggeration;
      positions[sample * 3 + 2] = z;
      const tint = hypsometric((grid.metres[sample] - colorRange.min) / colorSpan);
      colors[sample * 3] = tint[0];
      colors[sample * 3 + 1] = tint[1];
      colors[sample * 3 + 2] = tint[2];
      uvs[sample * 2] = (column + 0.5) / grid.width;
      uvs[sample * 2 + 1] = v;
    }
  }
}

function buildIndices(width: number, height: number): THREE.BufferAttribute {
  const indices = new Uint32Array((width - 1) * (height - 1) * 6);
  let offset = 0;
  for (let row = 0; row < height - 1; row += 1) {
    for (let column = 0; column < width - 1; column += 1) {
      const northwest = row * width + column;
      const northeast = northwest + 1;
      const southwest = northwest + width;
      const southeast = southwest + 1;
      indices[offset] = northwest;
      indices[offset + 1] = southwest;
      indices[offset + 2] = northeast;
      indices[offset + 3] = northeast;
      indices[offset + 4] = southwest;
      indices[offset + 5] = southeast;
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
  for (let index = 0; index < normals.count; index += 40) {
    sum += normals.getY(index);
    samples += 1;
  }
  return samples === 0 ? 1 : sum / samples;
}

function hypsometric(amount: number): [number, number, number] {
  const clamped = Math.min(1, Math.max(0, amount));
  for (let index = 1; index < HYPSO_STOPS.length; index += 1) {
    const [nextStop, nextColor] = HYPSO_STOPS[index];
    const [prevStop, prevColor] = HYPSO_STOPS[index - 1];
    if (clamped <= nextStop) {
      const mix = (clamped - prevStop) / (nextStop - prevStop);
      return [
        prevColor[0] + (nextColor[0] - prevColor[0]) * mix,
        prevColor[1] + (nextColor[1] - prevColor[1]) * mix,
        prevColor[2] + (nextColor[2] - prevColor[2]) * mix,
      ];
    }
  }
  return HYPSO_STOPS[HYPSO_STOPS.length - 1][1];
}
