/**
 * The blocks of Structure AD and Structure AC at Karahan Tepe. AD is drawn with the ring maths of enclosureModel.ts:
 * a built dry-stone wall round its eastern half, a two-step bench all the way round (rock-cut on the west, built on
 * the east), sixteen T-pillars in the wall and the central pair. AC is drawn as found: a kerb round a cap of flat stones.
 * Whatever is cut from the bedrock is a rock mass, drawn as one piece with the rock; whatever was laid is a box.
 */

import { bandStones, enclosurePillars, pillarBoxes, pointAtBearing, yawFacingOut, type Enclosure, type PillarSize, type StoneBox, type WallBand, type WallGap } from "./enclosureModel";
import { centreOf, HALF_CIRCLE_SEGMENTS, LOW_GROUND_M, radiusOf, ROOTED_IN_ROCK_M, structure, structureOutline } from "./karahanPlan";
import { AD_BUILT_WALL_HEIGHT_M, AD_BUILT_WALL_THICKNESS_M, KARAHAN_TEPE_DRAWING_ESTIMATES as ESTIMATES, type PillarGroup } from "./karahanTepeLayout";
import { ringSectorOutline } from "./planOutline";
import { cappingSlabs, liftedBy, type RockMass } from "./rockCutModel";

const WEST = 270;
const EAST = 90;
const SOUTH = 180;
/** How rough the built bench is beside the dry-stone wall (1) and the rock-cut bench (0). */
const BUILT_BENCH_ROUGHNESS = 0.4;
const AC_UPRIGHT_COUNT = 12;
const AC_KERB_DEPTH_M = 0.4;

function tPillarSize(group: PillarGroup): PillarSize {
  return {
    heightM: group.heightM,
    shaftWidthM: group.widthM,
    thicknessM: group.thicknessM ?? group.widthM,
    headLengthM: group.widthM * ESTIMATES.tPillarHeadLengthPerWidth,
    headHeightM: group.heightM * ESTIMATES.tPillarHeadHeightShare,
  };
}

function pillarGroup(groupId: string): PillarGroup {
  const group = structure("AD").pillarGroups.find((candidate) => candidate.id === groupId);
  if (!group) throw new Error(`Pillar group ${groupId} is not in Structure AD`);
  return group;
}

/** AD as one ring on a floor at y = 0, so the ring maths can place its pillars. It has no entrance: none is published. */
export function adAsRing(): Enclosure {
  const [bench] = structure("AD").benches;
  const wallPillars = pillarGroup("ad-wall-pillars");
  return {
    id: "AD",
    name: structure("AD").name,
    centre: centreOf("AD"),
    rings: [
      {
        innerRadiusM: radiusOf("AD"),
        wallThicknessM: AD_BUILT_WALL_THICKNESS_M,
        wallHeightM: AD_BUILT_WALL_HEIGHT_M,
        benchHeightM: bench.heightM,
        benchDepthM: bench.depthM,
        pillarCount: wallPillars.count,
        pillar: tPillarSize(wallPillars),
        gapBearingDeg: SOUTH,
        gapWidthM: 0,
      },
    ],
    centralPair: { pillar: tPillarSize(pillarGroup("ad-central-pair")), spacingM: ESTIMATES.adCentralPairSpacingM, pedestalHeightM: 0 },
  };
}

/** A band that runs round half a ring, left open on the half that faces this bearing. */
const halfRingGap = (band: WallBand, openBearingDeg: number): WallGap => ({ gapBearingDeg: openBearingDeg, gapWidthM: Math.PI * band.midRadiusM });

/** One step of AD's two-step bench: how far it stands out from the wall, and its foot and top above the floor. */
function benchTierSize(tier: number): { depthM: number; footM: number; topM: number } {
  const [bench] = structure("AD").benches;
  const riseM = bench.heightM / bench.tiers;
  return { depthM: (bench.depthM * (bench.tiers - tier)) / bench.tiers, footM: tier * riseM, topM: (tier + 1) * riseM };
}

const benchTiers = () => Array.from({ length: structure("AD").benches[0].tiers }, (_, tier) => benchTierSize(tier));

/** The laid stones of AD's bench, along the built eastern wall. */
function builtBench(random: () => number): StoneBox[] {
  return benchTiers().flatMap(({ depthM, footM, topM }) => {
    const band: WallBand = { midRadiusM: radiusOf("AD") - depthM / 2, depthM, heightM: topM - footM, raggedTop: false, roughness: BUILT_BENCH_ROUGHNESS };
    return liftedBy(bandStones(centreOf("AD"), halfRingGap(band, WEST), band, random), footM);
  });
}

/** [K21] the bench on AD's western half is carved from the same rock as the wall behind it. */
export function adRockMasses(): RockMass[] {
  return benchTiers().map(({ depthM, footM, topM }, tier) => ({
    id: `ad-rock-bench-${tier}`,
    outline: ringSectorOutline(centreOf("AD"), radiusOf("AD") - depthM, radiusOf("AD") + ROOTED_IN_ROCK_M, SOUTH, 360, HALF_CIRCLE_SEGMENTS),
    bottomM: LOW_GROUND_M + footM,
    topM: LOW_GROUND_M + topM,
  }));
}

function adBuiltWall(random: () => number): StoneBox[] {
  const [ring] = adAsRing().rings;
  const wall: WallBand = { midRadiusM: ring.innerRadiusM + ring.wallThicknessM / 2, depthM: ring.wallThicknessM, heightM: ring.wallHeightM, raggedTop: true, roughness: 1 };
  return bandStones(centreOf("AD"), halfRingGap(wall, WEST), wall, random);
}

/** Every laid or dressed block of AD, standing on its floor. */
export function adBoxes(random: () => number): StoneBox[] {
  const pillars = enclosurePillars(adAsRing()).flatMap(pillarBoxes);
  return liftedBy([...adBuiltWall(random), ...builtBench(random), ...pillars], LOW_GROUND_M);
}

/** [K21] the northern half of AC is edged by stones set upright. */
function acUprights(random: () => number): StoneBox[] {
  return Array.from({ length: AC_UPRIGHT_COUNT }, (_, slot): StoneBox => {
    const bearingDeg = WEST + ((slot + 0.5) / AC_UPRIGHT_COUNT) * 180;
    const [east, south] = pointAtBearing(centreOf("AC"), radiusOf("AC") + AC_KERB_DEPTH_M / 2, bearingDeg);
    const heightM = ESTIMATES.acKerbHeightM * (1 + 0.5 * random());
    return { kind: "slab", centre: [east, heightM / 2, south], size: [0.75, heightM, 0.22], yawRad: yawFacingOut(bearingDeg), shade: 0.75 + 0.3 * random() };
  });
}

/** [K21] the southern half of AC is bordered by bedrock: one unbroken kerb of rock. */
export function acRockMasses(): RockMass[] {
  const outline = ringSectorOutline(centreOf("AC"), radiusOf("AC"), radiusOf("AC") + AC_KERB_DEPTH_M, EAST, WEST, HALF_CIRCLE_SEGMENTS);
  return [{ id: "ac-rock-kerb", outline, bottomM: LOW_GROUND_M, topM: LOW_GROUND_M + ESTIMATES.acKerbHeightM }];
}

/** Every laid block of AC, standing on the low ground: uprights on the north, and the cap over the whole building. */
export function acBoxes(random: () => number): StoneBox[] {
  const capTopM = ESTIMATES.acKerbHeightM + ESTIMATES.cappingSlab.thicknessM / 2;
  const cap = cappingSlabs(structureOutline("AC"), capTopM, ESTIMATES.cappingSlab, random);
  return liftedBy([...acUprights(random), ...cap], LOW_GROUND_M);
}
