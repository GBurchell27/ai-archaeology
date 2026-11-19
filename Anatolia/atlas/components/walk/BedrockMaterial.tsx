"use client";

import { useMemo } from "react";
import type { Side, WebGLProgramParametersWithUniforms } from "three";
import type { Bore, WallFooting } from "@/lib/walk/rockCutModel";
import { floorContact } from "./stoneGrain";

// Value noise in world metres, so every surface cut from the same rock carries one continuous pattern with no seams,
// no tiling and no texture to go soft at arm's length. Five noise lookups: light enough for an integrated GPU.
const ROCK_TONE = /* glsl */ `
  varying vec3 rockMetres;
  // A hash with no sine in it: a sine hash turns to streaks at the large cell numbers of the finest grain.
  float rockHash(vec3 cell) {
    cell = fract(cell * vec3(0.1031, 0.103, 0.0973));
    cell += dot(cell, cell.yxz + 33.33);
    return fract((cell.x + cell.y) * cell.z);
  }
  float rockNoise(vec3 point) {
    vec3 cell = floor(point);
    vec3 blend = fract(point);
    blend = blend * blend * (3.0 - 2.0 * blend);
    vec2 step = vec2(1.0, 0.0);
    float lowNear = mix(rockHash(cell), rockHash(cell + step.xyy), blend.x);
    float highNear = mix(rockHash(cell + step.yxy), rockHash(cell + step.xxy), blend.x);
    float lowFar = mix(rockHash(cell + step.yyx), rockHash(cell + step.xyx), blend.x);
    float highFar = mix(rockHash(cell + step.yxx), rockHash(cell + step.xxx), blend.x);
    return mix(mix(lowNear, highNear, blend.y), mix(lowFar, highFar, blend.y), blend.z);
  }
  // The grain is read on axes turned away from the walls and floors, or its square cells would show on them.
  const mat3 GRAIN_AXES = mat3(0.36, 0.48, -0.8, -0.8, 0.6, 0.0, 0.48, 0.64, 0.6);
  // A grain fades out before it is finer than a pixel, so it never shimmers far away.
  float rockGrain(vec3 turned, float sizeM, float pixelM) {
    return (rockNoise(turned / sizeM + sizeM * 31.0) - 0.5) * clamp(2.0 - 2.0 * pixelM / sizeM, 0.0, 1.0);
  }
  float rockTone() {
    float pixelM = length(fwidth(rockMetres));
    vec3 turned = GRAIN_AXES * rockMetres;
    float weathering = rockNoise(rockMetres / 9.0) - 0.5;
    // Limestone lies in beds: thin level bands on a cut face, broad patches on a level one.
    float beds = rockNoise(rockMetres * vec3(0.4, 5.5, 0.4) + 40.0) - 0.5;
    float grain = 0.12 * rockGrain(turned, 0.33, pixelM) + 0.08 * rockGrain(turned, 0.045, pixelM);
    // The finest lookup is also the pitting: only its darkest specks show, as small holes in the surface.
    float pits = (1.0 - smoothstep(0.08, 0.22, rockNoise(turned / 0.011))) * clamp(2.0 - pixelM / 0.011, 0.0, 1.0);
    // Less sky reaches rock far below the surface, so a deep cut is a little darker at its foot.
    float sunk = clamp(-rockMetres.y / 5.0, 0.0, 1.0);
    return (1.0 + 0.2 * weathering + 0.13 * beds + grain - 0.08 * pits) * (1.0 - 0.07 * sunk);
  }
`;

const glslNumber = (value: number) => value.toFixed(3);
const glslVector = (values: readonly number[]) => `vec3(${values.map(glslNumber).join(", ")})`;

/** Drops every fragment inside a bore, so the rock faces it passes through are open. */
function boreDiscard({ from, to, radiusM }: Bore): string {
  const axis = to.map((value, index) => value - from[index]);
  return /* glsl */ `{
    vec3 fromEnd = rockMetres - ${glslVector(from)};
    vec3 axis = ${glslVector(axis)};
    float share = clamp(dot(fromEnd, axis) / dot(axis, axis), 0.0, 1.0);
    if (length(fromEnd - share * axis) < ${glslNumber(radiusM)}) discard;
  }`;
}

/** Shader lines that find the floor under a fragment: that of the room whose footing it is in, else `footM`. */
function footHeight(footM: number, footings: readonly WallFooting[]): string {
  const inRoom = ({ westM, eastM, northM, southM, floorM }: WallFooting) =>
    `if (rockMetres.x > ${glslNumber(westM)} && rockMetres.x < ${glslNumber(eastM)} && rockMetres.z > ${glslNumber(northM)} && rockMetres.z < ${glslNumber(southM)}) rockFootM = ${glslNumber(floorM)};`;
  return `\n  float rockFootM = ${glslNumber(footM)};\n  ${footings.map(inRoom).join("\n  ")}`;
}

type RockFoot = { footM: number | null; footings: readonly WallFooting[] };

function addRockTone(shader: WebGLProgramParametersWithUniforms, bores: readonly Bore[], { footM, footings }: RockFoot): void {
  const contact = footM === null ? "" : `${footHeight(footM, footings)}${floorContact("rockFootM", "rockMetres")}`;
  shader.vertexShader = `varying vec3 rockMetres;\n${shader.vertexShader}`.replace(
    "#include <begin_vertex>",
    "#include <begin_vertex>\n  rockMetres = (modelMatrix * vec4(transformed, 1.0)).xyz;",
  );
  shader.fragmentShader = `${ROCK_TONE}\n${shader.fragmentShader}`.replace(
    "#include <map_fragment>",
    `#include <map_fragment>\n${bores.map(boreDiscard).join("\n")}\n  diffuseColor.rgb *= rockTone();${contact}`,
  );
}

const NO_BORES: readonly Bore[] = [];
const NO_FOOTINGS: readonly WallFooting[] = [];

/** Pale limestone: the weathered surface of the hill, a freshly cut face, and a levelled floor trodden a little darker. */
export const ROCK_COLOUR = { weathered: "#a89e89", cut: "#d8cdb5", floor: "#c6bba3" } as const;

type BedrockMaterialProps = {
  colour: string;
  /** Round holes through the rock this material covers. */
  bores?: readonly Bore[];
  /** The height of the floor this rock stands on, where its foot is darker. Null for rock that stands on no floor. */
  footM?: number | null;
  /** Rooms whose walls this rock also is: inside a footing the foot is that room's floor instead of `footM`. */
  footings?: readonly WallFooting[];
  side?: Side;
  /** The mesh carries a shade for each vertex. */
  vertexColors?: boolean;
  /** Where the material goes when its mesh has more than one. */
  attach?: string;
};

/** Living limestone for a plain (not instanced) mesh: mottled and grained in world metres, darker far below the surface. */
export function BedrockMaterial({ colour, bores = NO_BORES, footM = null, footings = NO_FOOTINGS, side, vertexColors = false, attach = "material" }: BedrockMaterialProps) {
  const [compile, cacheKey] = useMemo(() => {
    const key = `bedrock:${footM}:${JSON.stringify(footings)}:${bores.map(boreDiscard).join()}`;
    return [(shader: WebGLProgramParametersWithUniforms) => addRockTone(shader, bores, { footM, footings }), () => key] as const;
  }, [bores, footM, footings]);
  return <meshStandardMaterial attach={attach} color={colour} roughness={1} metalness={0} side={side} vertexColors={vertexColors} onBeforeCompile={compile} customProgramCacheKey={cacheKey} />;
}
