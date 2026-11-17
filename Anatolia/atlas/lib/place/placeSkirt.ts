import * as THREE from "three";
import type { TerrainGrid } from "@/lib/terrain";
import { perimeterCells } from "./placeGeometry";

/** Walls from the terrain edge down to y = 0, so the window reads as a cut block of ground. */
export function buildSkirtGeometry(grid: TerrainGrid, origin: [number, number], datum: number): THREE.BufferGeometry {
  const [left, bottom, right, top] = grid.bounds;
  const cellWidth = (right - left) / grid.width;
  const cellHeight = (top - bottom) / grid.height;
  const cells = perimeterCells(grid.width, grid.height);
  const positions = new Float32Array(cells.length * 6);
  const indices = new Uint32Array(cells.length * 6);
  cells.forEach(([row, column], step) => {
    // Same cell-centre placement as buildTerrainGeometry, so the wall meets the surface edge.
    const x = left + (column + 0.5) * cellWidth - origin[0];
    const z = -(top - (row + 0.5) * cellHeight - origin[1]);
    positions.set([x, grid.metres[row * grid.width + column] - datum, z, x, 0, z], step * 6);
    const upper = step * 2;
    const nextUpper = ((step + 1) % cells.length) * 2;
    indices.set([upper, upper + 1, nextUpper, nextUpper, upper + 1, nextUpper + 1], step * 6);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  return geometry;
}
