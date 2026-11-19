"use client";

import { useMemo } from "react";
import { BufferGeometry, DoubleSide, Float32BufferAttribute, LatheGeometry, Vector2 } from "three";
import type { Block } from "@/lib/walk/enclosureModel";
import { boreRimPoint, type Bore, type RockCutModel } from "@/lib/walk/rockCutModel";
import { BedrockMaterial, ROCK_COLOUR } from "./BedrockMaterial";

/** Half the outline of a pillar one unit high and one across: a slightly narrower foot, a straight shaft, a domed top. */
const ROUND_PILLAR_PROFILE: ReadonlyArray<readonly [radius: number, height: number]> = [
  [0.44, -0.5],
  [0.5, -0.25],
  [0.5, 0.26],
  [0.47, 0.36],
  [0.38, 0.44],
  [0.22, 0.49],
  [0, 0.5],
];
/** Half the outline of a head one unit high and one across, chin first: a rounded jaw, fullest above the middle. */
const HEAD_PROFILE: ReadonlyArray<readonly [radius: number, height: number]> = [
  [0, -0.5],
  [0.17, -0.49],
  [0.28, -0.44],
  [0.35, -0.34],
  [0.4, -0.2],
  [0.46, -0.03],
  [0.5, 0.14],
  [0.48, 0.3],
  [0.39, 0.42],
  [0.22, 0.485],
  [0, 0.5],
];
/** Half the outline of the rock a head grows from, one unit long, from the wall to inside the head: broad at the wall, drawn in to a neck. */
const NECK_PROFILE: ReadonlyArray<readonly [radius: number, along: number]> = [
  [0.5, -0.5],
  [0.41, -0.46],
  [0.35, -0.4],
  [0.32, -0.3],
  [0.3, -0.15],
  [0.3, 0.5],
];
/** The front of the head is this much flatter than its back, and the jaw this much narrower than the brow. Neither is a feature of a face. */
const HEAD_FRONT_FLATTENING = 0.8;
const HEAD_JAW_NARROWING = 0.22;
const BORE_SIDES = 24;
/** How dark the rock of a bore is beside the face it opens in: at its mouths, and in its middle, where little light reaches. */
const BORE_SHADE = { mouth: 0.55, middle: 0.2 } as const;

function turnedGeometry(profile: ReadonlyArray<readonly [radius: number, height: number]>, sides: number): LatheGeometry {
  return new LatheGeometry(profile.map(([radius, height]) => new Vector2(radius, height)), sides);
}

/** A head with no face: the turned outline, flatter in front (its own +x) and narrower at the jaw. */
function headGeometry(): BufferGeometry {
  const geometry = turnedGeometry(HEAD_PROFILE, 24);
  const places = geometry.attributes.position;
  for (let vertex = 0; vertex < places.count; vertex += 1) {
    const [forward, up, across] = [places.getX(vertex), places.getY(vertex), places.getZ(vertex)];
    places.setXYZ(vertex, forward > 0 ? forward * HEAD_FRONT_FLATTENING : forward, up, across * (1 + HEAD_JAW_NARROWING * Math.min(up, 0)));
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** The neck lies along its own x: the wall end at -0.5, the head end at +0.5. */
const neckGeometry = () => turnedGeometry(NECK_PROFILE, 24).rotateZ(-Math.PI / 2);

/** The wall of a bore: a tube from the rim on one rock face to the rim on the other, shaded darker toward its middle. */
function boreLiningGeometry(bore: Bore): BufferGeometry {
  const turns = Array.from({ length: BORE_SIDES + 1 }, (_, side) => (side / BORE_SIDES) * 2 * Math.PI);
  const rings = turns.flatMap((turnRad) => {
    const [from, to] = [boreRimPoint(bore, "from", turnRad), boreRimPoint(bore, "to", turnRad)];
    return [...from, ...from.map((value, axis) => (value + to[axis]) / 2), ...to];
  });
  const shades = turns.flatMap(() => [BORE_SHADE.mouth, BORE_SHADE.middle, BORE_SHADE.mouth].flatMap((shade) => [shade, shade, shade]));
  // Two quads for each side: mouth to middle, middle to mouth.
  const quad = (first: number) => [first, first + 1, first + 3, first + 3, first + 1, first + 4];
  const faces = Array.from({ length: BORE_SIDES }, (_, side) => [...quad(3 * side), ...quad(3 * side + 1)]).flat();
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(rings, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(shades, 3));
  geometry.setIndex(faces);
  geometry.computeVertexNormals();
  return geometry;
}

function BoreLining({ bore }: { bore: Bore }) {
  const geometry = useMemo(() => boreLiningGeometry(bore), [bore]);
  return (
    // It casts a shadow so that its own roof shades its floor: the sun reaches in only at the mouth.
    <mesh geometry={geometry} castShadow receiveShadow>
      <BedrockMaterial colour={ROCK_COLOUR.cut} side={DoubleSide} vertexColors />
    </mesh>
  );
}

/** One rounded form scaled, turned and placed as its block says. `standsOnFloor` darkens its foot. */
function RockForm({ block, geometry, standsOnFloor = false }: { block: Block; geometry: BufferGeometry; standsOnFloor?: boolean }) {
  return (
    <mesh geometry={geometry} position={block.centre} scale={block.size} rotation={[0, block.yawRad, 0]} castShadow receiveShadow>
      <BedrockMaterial colour={ROCK_COLOUR.cut} footM={standsOnFloor ? block.centre[1] - block.size[1] / 2 : null} />
    </mesh>
  );
}

/** What was carved in the round from the living rock: the pillars left standing, plain rounded forms, and the walls of bores. */
export function RockCarvings({ site }: { site: Pick<RockCutModel, "roundPillars" | "bosses" | "bores"> }) {
  const roundPillar = useMemo(() => turnedGeometry(ROUND_PILLAR_PROFILE, 16), []);
  const forms = useMemo(() => ({ neck: neckGeometry(), head: headGeometry() }), []);
  return (
    <>
      {site.roundPillars.map((pillar, index) => (
        <RockForm key={index} block={pillar} geometry={roundPillar} standsOnFloor />
      ))}
      {site.bosses.map((boss, index) => (
        <RockForm key={index} block={boss} geometry={forms[boss.profile]} />
      ))}
      {site.bores.map((bore) => (
        <BoreLining key={bore.id} bore={bore} />
      ))}
    </>
  );
}
