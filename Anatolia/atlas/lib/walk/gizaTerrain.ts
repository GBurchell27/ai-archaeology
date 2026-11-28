/**
 * The Giza walk's ground: a height grid in walk metres (east, south, y up).
 * Pure. The bytes are the same encoding as `decodeHeight` in lib/terrain.ts.
 */

export type GizaTerrainRecord = {
  width: number;
  height: number;
  cellM: number;
  /** Walk-east of the western edge of the window. */
  westM: number;
  /** Walk-south of the northern edge of the window. */
  northM: number;
  /** Elevations the uint16 grid encodes, before the datum is removed. */
  minM: number;
  maxM: number;
  /** Subtracted so the plateau under the pyramids sits near y = 0. */
  datumM: number;
  /** How far each pyramid's base sits above that datum. */
  baseOffsetM: Readonly<Record<string, number>>;
  reliefCredit: string;
  imageryCredit: string;
  imageryDay: string;
  sceneId: string;
  note: string;
  /** SHA-256 of `height.u16`, written by the build so a stale grid fails the check. */
  heightSha256: string;
};

export type GizaTerrain = GizaTerrainRecord & { metres: Float32Array };

/** A height grid in the frame `buildTerrainGeometry` uses: y is already above the datum. */
export type WalkHeightGrid = {
  width: number;
  height: number;
  bounds: [number, number, number, number];
  metres: Float32Array;
};

const RECORD_NUMBERS = ["width", "height", "cellM", "westM", "northM", "minM", "maxM", "datumM"] as const;
const RECORD_TEXT = ["reliefCredit", "imageryCredit", "imageryDay", "sceneId", "note", "heightSha256"] as const;

export function readGizaTerrainRecord(value: unknown): GizaTerrainRecord {
  if (!isObject(value)) throw new Error("Giza terrain record is not an object");
  for (const key of RECORD_NUMBERS) {
    if (typeof value[key] !== "number" || !Number.isFinite(value[key])) throw new Error(`Giza terrain ${key} is missing`);
  }
  for (const key of RECORD_TEXT) {
    if (typeof value[key] !== "string" || value[key] === "") throw new Error(`Giza terrain ${key} is missing`);
  }
  const baseOffsetM = readOffsets(value.baseOffsetM);
  return { ...(value as GizaTerrainRecord), baseOffsetM };
}

/** Absolute elevations. `record.minM` is encoded 0 and `record.maxM` is encoded 65535. */
export function decodeGizaHeight(buffer: ArrayBuffer, record: GizaTerrainRecord): Float32Array {
  const encoded = new Uint16Array(buffer);
  const count = record.width * record.height;
  if (encoded.length !== count) throw new Error(`Height grid is ${encoded.length}, expected ${count}`);
  const span = record.maxM - record.minM;
  const metres = new Float32Array(count);
  for (let index = 0; index < count; index += 1) metres[index] = record.minM + (encoded[index] / 65535) * span;
  return metres;
}

/** Metres above the datum. Outside the window, the nearest cell on the edge. */
export function heightAt(terrain: GizaTerrain, east: number, south: number): number {
  const column = (east - terrain.westM) / terrain.cellM - 0.5;
  const row = (south - terrain.northM) / terrain.cellM - 0.5;
  return sampleBilinear(terrain, column, row) - terrain.datumM;
}

/** The same ground, in the frame the shared terrain mesh builder expects. */
export function walkHeightGrid(terrain: GizaTerrain): WalkHeightGrid {
  const eastSpan = terrain.width * terrain.cellM;
  const southSpan = terrain.height * terrain.cellM;
  const top = -terrain.northM;
  const metres = new Float32Array(terrain.metres.length);
  for (let index = 0; index < metres.length; index += 1) metres[index] = terrain.metres[index] - terrain.datumM;
  return {
    width: terrain.width,
    height: terrain.height,
    bounds: [terrain.westM, top - southSpan, terrain.westM + eastSpan, top],
    metres,
  };
}

function sampleBilinear(terrain: GizaTerrain, column: number, row: number): number {
  const col = clamp(column, 0, terrain.width - 1);
  const rowClamped = clamp(row, 0, terrain.height - 1);
  const col0 = Math.min(terrain.width - 1, Math.floor(col));
  const row0 = Math.min(terrain.height - 1, Math.floor(rowClamped));
  const col1 = Math.min(terrain.width - 1, col0 + 1);
  const row1 = Math.min(terrain.height - 1, row0 + 1);
  const blendCol = col - col0;
  const blendRow = rowClamped - row0;
  const at = (sampleRow: number, sampleCol: number) => terrain.metres[sampleRow * terrain.width + sampleCol];
  const north = at(row0, col0) * (1 - blendCol) + at(row0, col1) * blendCol;
  const south = at(row1, col0) * (1 - blendCol) + at(row1, col1) * blendCol;
  return north * (1 - blendRow) + south * blendRow;
}

function readOffsets(value: unknown): Readonly<Record<string, number>> {
  if (!isObject(value)) throw new Error("Giza terrain baseOffsetM is missing");
  const offsets: Record<string, number> = {};
  for (const id of ["khufu", "khafre", "menkaure"]) {
    const offset = value[id];
    if (typeof offset !== "number" || !Number.isFinite(offset)) throw new Error(`Giza terrain base of ${id} is missing`);
    offsets[id] = offset;
  }
  return offsets;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}
