"use client";

import { useMemo } from "react";
import { ExtrudeGeometry, ShapeGeometry, type BufferGeometry } from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { wallFootings, type FloorPatch, type RockCutModel, type RockMass } from "@/lib/walk/rockCutModel";
import { BedrockMaterial, ROCK_COLOUR } from "./BedrockMaterial";
import { LIE_FLAT, outlineShape } from "./outlineShape";

/** The terrace goes this far below the low ground, so its foot is never seen. */
const BURIED_FOOT_M = 0.3;

/** Faces that meet at less than this are one curved face, shaded smoothly; a sharper edge stays an edge. */
const CREASE_RAD = 0.7;

/** A rim is worn round, not knife sharp: how far the rounding reaches in from the face and down it. Chosen by eye. */
const WORN_RIM_M = { terrace: 0.12, mass: 0.04 } as const;
const RIM_STEPS = 3;

/** Smoothing the rim tilts the normals of the level faces it meets, which shades them unevenly: set those upright again. */
function levelledLids(geometry: BufferGeometry): BufferGeometry {
  const normals = geometry.attributes.normal;
  const lids = geometry.groups[0];
  for (let vertex = lids.start; vertex < lids.start + lids.count; vertex += 1) normals.setXYZ(vertex, 0, 0, Math.sign(normals.getZ(vertex)));
  return geometry;
}

/**
 * An outline raised into a solid with upright sides and a worn rim. It lies in its own x-y plane: turn it with
 * `LIE_FLAT`. Its top is `heightM` up; its foot goes one rim deeper than its base, where the lower rim is out of sight.
 */
function raisedGeometry(shape: ReturnType<typeof outlineShape>, heightM: number, rimM: number): BufferGeometry {
  const rim = { bevelEnabled: true, bevelThickness: rimM, bevelSize: rimM, bevelOffset: -rimM, bevelSegments: RIM_STEPS };
  return levelledLids(toCreasedNormals(new ExtrudeGeometry(shape, { depth: heightM - rimM, ...rim }), CREASE_RAD));
}

function terraceGeometry(site: RockCutModel, thicknessM: number): BufferGeometry {
  const shape = outlineShape(site.terraceOutline);
  shape.holes = site.rooms.map((room) => outlineShape(room.outline));
  return raisedGeometry(shape, thicknessM, WORN_RIM_M.terrace);
}

/** A levelled rock floor. */
function Floor({ floor }: { floor: FloorPatch }) {
  const geometry = useMemo(() => new ShapeGeometry(outlineShape(floor.outline)), [floor]);
  return (
    <mesh geometry={geometry} rotation={LIE_FLAT} position={[0, floor.heightM, 0]} receiveShadow>
      <BedrockMaterial colour={ROCK_COLOUR.floor} />
    </mesh>
  );
}

/** A bench, ledge, step or kerb left standing in the rock. */
function Mass({ mass }: { mass: RockMass }) {
  const geometry = useMemo(() => raisedGeometry(outlineShape(mass.outline), mass.topM - mass.bottomM, WORN_RIM_M.mass), [mass]);
  return (
    <mesh geometry={geometry} rotation={LIE_FLAT} position={[0, mass.bottomM, 0]} castShadow receiveShadow>
      <BedrockMaterial colour={ROCK_COLOUR.cut} footM={mass.bottomM} />
    </mesh>
  );
}

/**
 * The rock the site is cut into, as one solid: a weathered top at y = 0, the rooms as holes through it, and paler
 * cut faces for their walls and for the edge of the terrace, open where a bore passes through and darker at the foot,
 * where each meets its own floor. Each floor is a
 * patch at its own depth, and whatever was left standing in the rock is drawn in the same rock.
 */
export function BedrockTerrace({ site }: { site: RockCutModel }) {
  const thicknessM = BURIED_FOOT_M - site.lowGroundM;
  const geometry = useMemo(() => terraceGeometry(site, thicknessM), [site, thicknessM]);
  const footings = useMemo(() => wallFootings(site.rooms), [site.rooms]);
  return (
    <>
      <mesh geometry={geometry} rotation={LIE_FLAT} position={[0, -thicknessM, 0]} castShadow receiveShadow>
        <BedrockMaterial attach="material-0" colour={ROCK_COLOUR.weathered} />
        <BedrockMaterial attach="material-1" colour={ROCK_COLOUR.cut} bores={site.bores} footM={site.lowGroundM} footings={footings} />
      </mesh>
      {site.floors.map((floor) => (
        <Floor key={floor.id} floor={floor} />
      ))}
      {site.rockMasses.map((mass) => (
        <Mass key={mass.id} mass={mass} />
      ))}
    </>
  );
}
