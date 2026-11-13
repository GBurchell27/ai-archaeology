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
  return buildWindowGeometry(grid, origin, datum, exaggeration, 0, 0, grid.width, grid.height);
}

function buildWindowGeometry(
  grid: TerrainGrid,
  origin: [number, number],
  datum: number,
  exaggeration: number,
  row0: number,
  col0: number,
  width: number,
  height: number,
): THREE.BufferGeometry {
  const [left, bottom, right, top] = grid.bounds;
  const positions = new Float32Array(width * height * 3);
  const uvs = new Float32Array(width * height * 2);
  const cellWidth = (right - left) / grid.width;
  const cellHeight = (top - bottom) / grid.height;
  for (let row = 0; row < height; row += 1) {
    const sourceRow = row0 + row;
    const north = top - (sourceRow + 0.5) * cellHeight;
    const zValue = -(north - origin[1]);
    const vCoord = 1 - (sourceRow + 0.5) / grid.height;
    for (let column = 0; column < width; column += 1) {
      const sourceColumn = col0 + column;
      const east = left + (sourceColumn + 0.5) * cellWidth;
      const sample = row * width + column;
      positions[sample * 3] = east - origin[0];
      positions[sample * 3 + 1] = (grid.metres[sourceRow * grid.width + sourceColumn] - datum) * exaggeration;
      positions[sample * 3 + 2] = zValue;
      uvs[sample * 2] = (sourceColumn + 0.5) / grid.width;
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
  geometry.computeBoundingSphere();
  return geometry;
}

function buildIndices(width: number, height: number): THREE.BufferAttribute {
  const indices = width * height <= 65536
    ? new Uint16Array((width - 1) * (height - 1) * 6)
    : new Uint32Array((width - 1) * (height - 1) * 6);
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

export const FAR_STRIDE = 5;
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

export function sliceTerrainTiles(
  grid: TerrainGrid,
  origin: [number, number],
  datum: number,
  exaggeration: number,
  cellsPerTile = TILE_CELLS,
): THREE.BufferGeometry[] {
  return Array.from(terrainTiles(grid, origin, datum, exaggeration, cellsPerTile));
}

/** Build each tile with a one-cell border so its edge normals match its neighbours. */
export function* terrainTiles(
  grid: TerrainGrid,
  origin: [number, number],
  datum: number,
  exaggeration: number,
  cellsPerTile = TILE_CELLS,
): Generator<THREE.BufferGeometry> {
  if (!Number.isInteger(cellsPerTile) || cellsPerTile < 1) throw new Error("tile must cover at least one cell");
  for (let row0 = 0; row0 < grid.height - 1; row0 += cellsPerTile) {
    const rows = Math.min(cellsPerTile + 1, grid.height - row0);
    for (let col0 = 0; col0 < grid.width - 1; col0 += cellsPerTile) {
      const columns = Math.min(cellsPerTile + 1, grid.width - col0);
      const top = Math.max(0, row0 - 1);
      const left = Math.max(0, col0 - 1);
      const width = Math.min(grid.width, col0 + columns + 1) - left;
      const height = Math.min(grid.height, row0 + rows + 1) - top;
      const padded = buildWindowGeometry(grid, origin, datum, exaggeration, top, left, width, height);
      const tile = new THREE.BufferGeometry();
      for (const key of ["position", "uv", "normal"]) {
        const attribute = padded.getAttribute(key) as THREE.BufferAttribute;
        const itemSize = attribute.itemSize;
        const data = new Float32Array(columns * rows * itemSize);
        for (let row = 0; row < rows; row += 1) {
          const offset = ((row0 - top + row) * width + col0 - left) * itemSize;
          data.set(attribute.array.subarray(offset, offset + columns * itemSize), row * columns * itemSize);
        }
        tile.setAttribute(key, new THREE.BufferAttribute(data, itemSize));
      }
      tile.setIndex(buildIndices(columns, rows));
      tile.computeBoundingSphere();
      padded.dispose();
      yield tile;
    }
  }
}
