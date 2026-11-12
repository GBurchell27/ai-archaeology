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

/** Keep every `stride` cell. Stride 1 is the source grid. */
export function decimateGrid(grid: TerrainGrid, stride: number): TerrainGrid {
  if (stride <= 1) return grid;
  const columns = Math.ceil(grid.width / stride);
  const rows = Math.ceil(grid.height / stride);
  const metres = new Float32Array(columns * rows);
  for (let row = 0; row < rows; row += 1) {
    const sourceRow = Math.min(grid.height - 1, row * stride);
    for (let column = 0; column < columns; column += 1) {
      const sourceColumn = Math.min(grid.width - 1, column * stride);
      metres[row * columns + column] = grid.metres[sourceRow * grid.width + sourceColumn];
    }
  }
  return { ...grid, width: columns, height: rows, metres };
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
  return finishGeometry(geometry);
}

function finishGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
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

export const FAR_STRIDE = 8;
export const TILE_CELLS = 96;

/** Source indexes kept by the far mesh, always including the last cell. */
export function coarseSampleIndexes(count: number, stride: number): number[] {
  const step = Math.max(1, Math.floor(stride));
  const indexes: number[] = [];
  for (let index = 0; index < count; index += step) indexes.push(index);
  const last = count - 1;
  if (indexes.length === 0 || indexes[indexes.length - 1] !== last) indexes.push(last);
  return indexes;
}

/**
 * One low-vertex mesh for the view where the whole country is on screen.
 * Each kept sample stays on its source-cell centre, so the surface does not
 * slide when the view switches to the full-resolution tiles.
 */
export function coarseTerrainGeometry(
  grid: TerrainGrid,
  origin: [number, number],
  datum: number,
  exaggeration: number,
  stride = FAR_STRIDE,
): THREE.BufferGeometry {
  const columnIndexes = coarseSampleIndexes(grid.width, stride);
  const rowIndexes = coarseSampleIndexes(grid.height, stride);
  const columns = columnIndexes.length;
  const rows = rowIndexes.length;
  const [left, bottom, right, top] = grid.bounds;
  const cellWidth = (right - left) / grid.width;
  const cellHeight = (top - bottom) / grid.height;
  const spanX = right - left;
  const spanY = top - bottom;
  const positions = new Float32Array(columns * rows * 3);
  const uvs = new Float32Array(columns * rows * 2);
  for (let row = 0; row < rows; row += 1) {
    const sourceRow = rowIndexes[row];
    const north = top - (sourceRow + 0.5) * cellHeight;
    const zValue = -(north - origin[1]);
    const vCoord = spanY === 0 ? 0 : (north - bottom) / spanY;
    for (let column = 0; column < columns; column += 1) {
      const sourceColumn = columnIndexes[column];
      const east = left + (sourceColumn + 0.5) * cellWidth;
      const sample = row * columns + column;
      positions[sample * 3] = east - origin[0];
      positions[sample * 3 + 1] = (grid.metres[sourceRow * grid.width + sourceColumn] - datum) * exaggeration;
      positions[sample * 3 + 2] = zValue;
      uvs[sample * 2] = spanX === 0 ? 0 : (east - left) / spanX;
      uvs[sample * 2 + 1] = vCoord;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(buildIndices(columns, rows));
  return finishGeometry(geometry);
}

/**
 * Full-resolution tiles cut from one normal pass, so shared edges match.
 * The full mesh is disposed; callers draw only the tiles the frustum hits.
 */
export function sliceTerrainTiles(
  grid: TerrainGrid,
  origin: [number, number],
  datum: number,
  exaggeration: number,
  cellsPerTile = TILE_CELLS,
): THREE.BufferGeometry[] {
  if (!(cellsPerTile >= 1)) throw new Error("tile must cover at least one cell");
  const full = buildTerrainGeometry(grid, origin, datum, exaggeration);
  const position = full.getAttribute("position");
  const uv = full.getAttribute("uv");
  const normal = full.getAttribute("normal");
  const tiles: THREE.BufferGeometry[] = [];
  for (let row0 = 0; row0 < grid.height - 1; row0 += cellsPerTile) {
    const rows = Math.min(cellsPerTile, grid.height - 1 - row0);
    for (let col0 = 0; col0 < grid.width - 1; col0 += cellsPerTile) {
      const cols = Math.min(cellsPerTile, grid.width - 1 - col0);
      tiles.push(copyTile(grid.width, position, uv, normal, row0, col0, rows, cols));
    }
  }
  full.dispose();
  return tiles;
}

function copyTile(
  gridWidth: number,
  position: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  uv: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  normal: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  row0: number,
  col0: number,
  rows: number,
  cols: number,
): THREE.BufferGeometry {
  const vertRows = rows + 1;
  const vertCols = cols + 1;
  const count = vertRows * vertCols;
  const positions = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const normals = new Float32Array(count * 3);
  for (let row = 0; row < vertRows; row += 1) {
    for (let column = 0; column < vertCols; column += 1) {
      const local = row * vertCols + column;
      const global = (row0 + row) * gridWidth + (col0 + column);
      copyVector(position, global, positions, local, 3);
      copyVector(uv, global, uvs, local, 2);
      copyVector(normal, global, normals, local, 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setIndex(tileIndices(vertCols, rows, cols));
  geometry.computeBoundingSphere();
  return geometry;
}

function copyVector(
  source: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  from: number,
  target: Float32Array,
  to: number,
  width: number,
): void {
  for (let channel = 0; channel < width; channel += 1) {
    target[to * width + channel] = source.getComponent(from, channel);
  }
}

function tileIndices(vertCols: number, rows: number, cols: number): THREE.BufferAttribute {
  const indices = new Uint32Array(rows * cols * 6);
  let offset = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < cols; column += 1) {
      const northwest = row * vertCols + column;
      const northeast = northwest + 1;
      const southwest = northwest + vertCols;
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
