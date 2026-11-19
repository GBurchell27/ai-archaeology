import { BufferGeometry, Float32BufferAttribute, type WebGLProgramParametersWithUniforms } from "three";
import { bevelledBlock } from "@/lib/walk/blockBevel";

/**
 * The unit block of `lib/walk/blockBevel.ts` as a geometry: 44 triangles where a plain box has 12. Until the shader
 * of `addWornEdges` pulls its vertices in it is a plain box, which is what the shadow pass draws.
 * `footTaper` narrows the foot along the block's length, for a T-pillar's shaft and head. `endTaper` makes the far
 * end of its length less deep, for a limb in relief.
 */
export function bevelledBlockGeometry({ footTaper = 1, endTaper = 1 }: { footTaper?: number; endTaper?: number } = {}): BufferGeometry {
  const { positions, normals, triangles } = bevelledBlock();
  const tapered = positions.map((value, index) => {
    if (index % 3 === 2) return positions[index - 1] < 0 ? value * footTaper : value;
    return index % 3 === 1 && positions[index + 1] > 0 ? value * endTaper : value;
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(tapered, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geometry.setIndex(triangles);
  return geometry;
}

/** The edge of a small block is worn by no more than this share of its thinnest side, so a thin slab keeps its faces. */
const MOST_OF_THINNEST_SIDE = 0.3;

// Each vertex moves inwards across its own face. The width is in metres whatever the size of the instance.
const wearEdges = (bevelM: number) => /* glsl */ `
  #ifdef USE_INSTANCING
    vec3 blockSizeM = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
    float wornM = min(${bevelM.toFixed(3)}, ${MOST_OF_THINNEST_SIDE} * min(blockSizeM.x, min(blockSizeM.y, blockSizeM.z)));
    transformed -= sign(position) * (1.0 - abs(normal)) * wornM / blockSizeM;
  #endif
`;

/** An `onBeforeCompile` step for instances of `bevelledBlockGeometry`: wears every edge by `bevelM` metres. */
export function addWornEdges(shader: WebGLProgramParametersWithUniforms, bevelM: number): void {
  shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>\n${wearEdges(bevelM)}`);
}

/**
 * A wall stone is a plain box, and there are thousands. Its arrises are rounded in the light only: how far in from an
 * edge the shading turns, and how much darker the joint between two stones is.
 */
const SHADED_ARRIS = { radiusM: 0.035, jointDarkening: 0.24 } as const;

const ARRIS_VARYINGS = /* glsl */ `
  varying vec3 blockLocalM;
  varying vec3 blockHalfM;
  varying mat3 blockViewAxes;
`;

const blockFrame = /* glsl */ `
  #ifdef USE_INSTANCING
    mat3 blockAxes = mat3(instanceMatrix);
    vec3 blockSizeM = vec3(length(blockAxes[0]), length(blockAxes[1]), length(blockAxes[2]));
    blockLocalM = position * blockSizeM;
    blockHalfM = 0.5 * blockSizeM;
    blockViewAxes = mat3(modelViewMatrix) * mat3(blockAxes[0] / blockSizeM.x, blockAxes[1] / blockSizeM.y, blockAxes[2] / blockSizeM.z);
  #endif
`;

// On a face its own axis counts in full and the other two only near an edge, so the three together are the normal of
// a box with rounded edges. It fades out before the rounding is finer than a pixel, so a far wall does not shimmer.
const arrisTurn = /* glsl */ `
  vec3 arrisNearness = 1.0 - smoothstep(0.0, ${SHADED_ARRIS.radiusM}, blockHalfM - abs(blockLocalM));
  float arrisShown = clamp(2.0 - 2.0 * length(fwidth(blockLocalM)) / ${SHADED_ARRIS.radiusM}, 0.0, 1.0);
  float inJoint = clamp(arrisNearness.x + arrisNearness.y + arrisNearness.z - 1.0, 0.0, 1.0);
  diffuseColor.rgb *= 1.0 - ${SHADED_ARRIS.jointDarkening} * arrisShown * inJoint * inJoint;
`;

const arrisNormal = /* glsl */ `
  normal = normalize(mix(normal, blockViewAxes * (sign(blockLocalM) * arrisNearness), arrisShown));
`;

/**
 * An `onBeforeCompile` step for instances of a plain box: shades each edge as if it were worn round and darkens the
 * joints, with no more triangles and no noise lookup.
 */
export function addShadedArrises(shader: WebGLProgramParametersWithUniforms): void {
  shader.vertexShader = `${ARRIS_VARYINGS}\n${shader.vertexShader}`.replace("#include <begin_vertex>", `#include <begin_vertex>\n${blockFrame}`);
  shader.fragmentShader = `${ARRIS_VARYINGS}\n${shader.fragmentShader}`
    .replace("#include <color_fragment>", `#include <color_fragment>\n${arrisTurn}`)
    .replace("#include <normal_fragment_begin>", `#include <normal_fragment_begin>\n${arrisNormal}`);
}
