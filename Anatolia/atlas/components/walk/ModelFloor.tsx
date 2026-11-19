"use client";

import { useMemo } from "react";
import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type WebGLProgramParametersWithUniforms } from "three";

const GRIT_TILE_M = 2;
const GRIT_TILE_PX = 512;
/** What the grit is multiplied by: nothing for bare earth, olive for a grassed steppe. */
const EARTH_TINT = "#ffffff";
const GRASS_TINT = "#c9d99a";

/** A small tile of even fine grit. Even grit can repeat unseen; the broad patches come from the shader below. */
function gritTexture(repeats: number): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = GRIT_TILE_PX;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#7a7165";
    context.fillRect(0, 0, GRIT_TILE_PX, GRIT_TILE_PX);
    for (let speck = 0; speck < 14000; speck += 1) {
      const sizePx = 0.8 + Math.random() * 2.2;
      context.fillStyle = Math.random() > 0.5 ? "rgba(214, 196, 164, 0.2)" : "rgba(52, 40, 28, 0.2)";
      context.beginPath();
      context.ellipse(Math.random() * GRIT_TILE_PX, Math.random() * GRIT_TILE_PX, sizePx, sizePx * (0.5 + Math.random() * 0.5), Math.random() * Math.PI, 0, 2 * Math.PI);
      context.fill();
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.setScalar(repeats);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

// Value noise over the floor in metres, three sizes of patch summed. It never repeats, unlike a tiled image.
const PATCH_NOISE = /* glsl */ `
  varying vec2 floorMetres;
  float floorHash(vec2 cell) { return fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453); }
  float floorNoise(vec2 point) {
    vec2 cell = floor(point);
    vec2 blend = fract(point);
    blend = blend * blend * (3.0 - 2.0 * blend);
    float low = mix(floorHash(cell), floorHash(cell + vec2(1.0, 0.0)), blend.x);
    float high = mix(floorHash(cell + vec2(0.0, 1.0)), floorHash(cell + vec2(1.0, 1.0)), blend.x);
    return mix(low, high, blend.y);
  }
  float floorPatches(vec2 metres) {
    return 0.5 * floorNoise(metres / 19.0) + 0.3 * floorNoise(metres / 6.1 + 40.0) + 0.2 * floorNoise(metres / 1.7 + 90.0);
  }
`;

/** Adds the broad patches to the standard material, keeping its lighting, shadows and fog. */
function addBroadPatches(shader: WebGLProgramParametersWithUniforms): void {
  shader.vertexShader = `varying vec2 floorMetres;\n${shader.vertexShader}`.replace(
    "#include <begin_vertex>",
    // The third axis is 0 on a flat floor. On an upright face it stops the patches running as vertical stripes.
    "#include <begin_vertex>\n  floorMetres = position.xy + position.z * vec2(0.6, 0.8);",
  );
  shader.fragmentShader = `${PATCH_NOISE}\n${shader.fragmentShader}`.replace(
    "#include <map_fragment>",
    "#include <map_fragment>\n  diffuseColor.rgb *= 0.8 + 0.4 * floorPatches(floorMetres);",
  );
}

type GroundMaterialProps = {
  /** How wide the surface's texture coordinates run, in metres: 1 where they already are metres. */
  spanM: number;
  /** What the grit is multiplied by: a colour, or linear red, green and blue, which may pass 1 to lighten it. */
  tint: string | [number, number, number];
  /** Where the material goes when its mesh has more than one. */
  attach?: string;
};

/**
 * Grit under broad patches for any flat surface whose geometry lies in its own x-y plane in metres, turned to lie flat.
 */
export function GroundMaterial({ spanM, tint, attach = "material" }: GroundMaterialProps) {
  const texture = useMemo(() => gritTexture(spanM / GRIT_TILE_M), [spanM]);
  return <meshStandardMaterial attach={attach} map={texture} color={tint} roughness={1} metalness={0} onBeforeCompile={addBroadPatches} />;
}

/** The ground out to the far hills: packed earth, or a grassed steppe while `grassed` is set. */
export function ModelFloor({ radiusM, grassed }: { radiusM: number; grassed: boolean }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[2 * radiusM, 2 * radiusM]} />
      <GroundMaterial spanM={2 * radiusM} tint={grassed ? GRASS_TINT : EARTH_TINT} />
    </mesh>
  );
}
