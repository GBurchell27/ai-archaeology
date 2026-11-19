import { Shape, Vector2 } from "three";
import type { Outline } from "@/lib/walk/planOutline";

/** A plan outline as a shape in its own x-y plane: x is east, y is north. */
export function outlineShape(outline: Outline): Shape {
  return new Shape(outline.map(([east, south]) => new Vector2(east, -south)));
}

/** Turns such a shape to lie flat in the scene, with its own z pointing up. */
export const LIE_FLAT: [number, number, number] = [-Math.PI / 2, 0, 0];
