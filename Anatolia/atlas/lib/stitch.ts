import { sampleMeshHeight } from "@/lib/geo";
import type { TerrainGrid } from "@/lib/terrain";

/** Blend the outer ring of a detail window onto the national surface so the tile does not float. */
export function stitchDetailToNational(detail: TerrainGrid, national: TerrainGrid): TerrainGrid {
  const { width, height, bounds, metres } = detail;
  const stitched = new Float32Array(metres.length);
  const band = Math.max(8, Math.round(Math.min(width, height) * 0.12));
  const [left, , right, top] = bounds;
  const cellWidth = (right - left) / width;
  const cellHeight = (top - bounds[1]) / height;
  for (let row = 0; row < height; row += 1) {
    writeRow(stitched, detail, national, row, band, cellWidth, cellHeight, left, top);
  }
  return { ...detail, metres: stitched };
}

function writeRow(
  stitched: Float32Array,
  detail: TerrainGrid,
  national: TerrainGrid,
  row: number,
  band: number,
  cellWidth: number,
  cellHeight: number,
  left: number,
  top: number,
): void {
  const { width, height, metres } = detail;
  const north = top - (row + 0.5) * cellHeight;
  const edgeRow = Math.min(row, height - 1 - row);
  for (let column = 0; column < width; column += 1) {
    const index = row * width + column;
    const edge = Math.min(edgeRow, column, width - 1 - column);
    if (edge >= band) {
      stitched[index] = metres[index];
      continue;
    }
    const east = left + (column + 0.5) * cellWidth;
    const base = sampleMeshHeight(national.metres, national.width, national.height, national.bounds, east, north);
    const weight = smoothstep(edge / band);
    stitched[index] = base + (metres[index] - base) * weight;
  }
}

function smoothstep(amount: number): number {
  const clamped = Math.min(1, Math.max(0, amount));
  return clamped * clamped * (3 - 2 * clamped);
}
