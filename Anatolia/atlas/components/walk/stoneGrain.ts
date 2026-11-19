import type { WebGLProgramParametersWithUniforms } from "three";

// Worked limestone for instanced blocks: weathering in tall soft patches and a fine grain, computed from world metres,
// so a face in shade is not one flat grey and nothing tiles. Four noise lookups: light enough for an integrated GPU.
const STONE_TONE = /* glsl */ `
  varying vec3 stoneMetres;
  float stoneHash(vec3 cell) {
    cell = fract(cell * vec3(0.1031, 0.103, 0.0973));
    cell += dot(cell, cell.yxz + 33.33);
    return fract((cell.x + cell.y) * cell.z);
  }
  float stoneNoise(vec3 point) {
    vec3 cell = floor(point);
    vec3 blend = fract(point);
    blend = blend * blend * (3.0 - 2.0 * blend);
    vec2 step = vec2(1.0, 0.0);
    float lowNear = mix(stoneHash(cell), stoneHash(cell + step.xyy), blend.x);
    float highNear = mix(stoneHash(cell + step.yxy), stoneHash(cell + step.xxy), blend.x);
    float lowFar = mix(stoneHash(cell + step.yyx), stoneHash(cell + step.xyx), blend.x);
    float highFar = mix(stoneHash(cell + step.yxx), stoneHash(cell + step.xxx), blend.x);
    return mix(mix(lowNear, highNear, blend.y), mix(lowFar, highFar, blend.y), blend.z);
  }
  // A grain fades out before it is finer than a pixel, so it never shimmers far away.
  float stoneGrain(float sizeM, float pixelM) {
    return (stoneNoise(stoneMetres / sizeM + sizeM * 57.0) - 0.5) * clamp(2.0 - 2.0 * pixelM / sizeM, 0.0, 1.0);
  }
  float stoneTone() {
    float pixelM = length(fwidth(stoneMetres));
    // Stretched upwards: rain streaks a standing stone from top to bottom.
    float weathering = stoneNoise(stoneMetres * vec3(1.6, 0.45, 1.6)) - 0.5;
    float blotches = stoneNoise(stoneMetres / 0.23 + 17.0) - 0.5;
    return 1.0 + 0.2 * weathering + 0.1 * blotches + 0.12 * stoneGrain(0.05, pixelM) + 0.14 * stoneGrain(0.012, pixelM);
  }
`;

/** Little of the sky reaches the foot of a wall or a standing stone: how much darker it is on the floor, and how high that fades out. */
const FLOOR_CONTACT = { darkening: 0.22, reachM: 0.55 } as const;

/**
 * Shader lines that darken the foot of whatever stands on a floor at `floorM`: a height, or the name of a shader
 * float that holds it. `metres` names the fragment's place in the world.
 */
export const floorContact = (floorM: number | string, metres = "stoneMetres") => /* glsl */ `
  diffuseColor.rgb *= 1.0 - ${FLOOR_CONTACT.darkening} * (1.0 - smoothstep(0.0, ${FLOOR_CONTACT.reachM}, ${metres}.y - (${typeof floorM === "number" ? floorM.toFixed(3) : floorM})));
`;

const WORLD_METRES = /* glsl */ `
  vec4 stonePlace = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    stonePlace = instanceMatrix * stonePlace;
  #endif
  stoneMetres = (modelMatrix * stonePlace).xyz;
`;

/**
 * An `onBeforeCompile` for a standard material: multiplies its colour by the stone tone at each fragment's place in
 * the world. With `floorM`, the height of the floor the stones stand on, they are also darker where they meet it.
 */
export function addStoneGrain(shader: WebGLProgramParametersWithUniforms, floorM: number | null = null): void {
  shader.vertexShader = `varying vec3 stoneMetres;\n${shader.vertexShader}`.replace("#include <begin_vertex>", `#include <begin_vertex>\n${WORLD_METRES}`);
  const contact = floorM === null ? "" : floorContact(floorM);
  shader.fragmentShader = `${STONE_TONE}\n${shader.fragmentShader}`.replace("#include <color_fragment>", `#include <color_fragment>\n  diffuseColor.rgb *= stoneTone();${contact}`);
}
