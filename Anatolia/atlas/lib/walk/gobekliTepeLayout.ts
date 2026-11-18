/**
 * Schematic layout of Enclosures A to D at Göbekli Tepe, in local metres from an arbitrary origin (the walker's start).
 * A diagram from published figures, not a survey. No real-world coordinates belong in this file.
 *
 * [HG] = Haklay & Gopher 2020, "Geometry and Architectural Planning at Göbekli Tepe, Turkey", Cambridge
 *        Archaeological Journal 30(2), doi:10.1017/S0959774319000660, which restates the DAI excavation reports
 *        (Schmidt; Dietrich; Notroff). Figures were read from the article text, not measured from its plans.
 * [S10] = Schmidt 2010, "Göbekli Tepe - the Stone Age Sanctuaries", Documenta Praehistorica 37, 239-256,
 *        doi:10.4312/dp.37.21. Read as text; nothing was measured from its plans or photographs.
 * [TT]  = The Tepe Telegrams, the DAI project's own notes: "Enclosure A, a short overview" and "Enclosure B, a short
 *        overview" (Dietrich 2017), "Boars in Göbekli Tepe's Enclosure C" (Dietrich 2016).
 * [EST] = estimated for this model. Not a published figure.
 *
 * Simplifications: every enclosure is drawn as a circle (D and C are oval, A is closer to a rectangle), the floor is
 * one level (C's outer passage lies about 2.1 m above its centre [HG]), walls stand free instead of holding back
 * the mound, and pillars stand evenly spaced round each ring. Of the published reliefs only the arms, hands, belts
 * and loincloths of D's central pair are sketched; animal reliefs such as the foxes on B's central pillars are not.
 *
 * Pillar numbers are the excavation's. Only pillars that carry a landmark are numbered here, and a slot is a place
 * in the evenly spaced ring, so even a published side ("north-west") becomes a nearby slot, not a surveyed spot.
 */

import type { Enclosure, EnclosureRing, PillarSize, WalkModel } from "./enclosureModel";
import { GOBEKLI_TEPE_HYPOTHESES } from "./gobekliTepeHypotheses";

/** [HG] peripheral pillars are 3 to 4 m high. [EST] every other proportion. */
const PERIMETER_PILLAR: PillarSize = { heightM: 3.5, shaftWidthM: 0.9, thicknessM: 0.4, headLengthM: 1.45, headHeightM: 0.75 };
/** [EST] B and A are smaller buildings, so the low end of the 3 to 4 m range. */
const SMALL_PERIMETER_PILLAR: PillarSize = { ...PERIMETER_PILLAR, heightM: 3 };
/** [HG] D's central pair rises to 5.5 m, the tallest on site ([S10]: 5.4 m and 5.3 m). [EST] width, thickness and head. */
const CENTRAL_PILLAR_D: PillarSize = { heightM: 5.5, shaftWidthM: 1.3, thicknessM: 0.5, headLengthM: 2.2, headHeightM: 1.1 };
/** [EST] central pillars elsewhere: taller than their ring, shorter than D's. Only "up to 5.5 m" is published. */
const CENTRAL_PILLAR: PillarSize = { heightM: 4.5, shaftWidthM: 1.1, thicknessM: 0.45, headLengthM: 1.85, headHeightM: 0.9 };
const SMALL_CENTRAL_PILLAR: PillarSize = { ...CENTRAL_PILLAR, heightM: 3.8 };

/**
 * [EST] shared by every ring. D's wall is preserved to over 3 m [HG]; 2.8 m is drawn so the pillars stand clear.
 * Benches between the pillars are published; their size is not, except C's, which rises up to 1.6 m [HG].
 * [EST] the wall opens to the south. Only C's southern entrance is published [HG].
 */
const RING_DEFAULTS = { wallThicknessM: 1, wallHeightM: 2.8, benchHeightM: 0.5, benchDepthM: 0.6, gapBearingDeg: 180, gapWidthM: 1.8 };

type NumberedSlots = EnclosureRing["numberedSlots"];

function ring(innerDiameterM: number, pillarCount: number, pillar = PERIMETER_PILLAR, numberedSlots?: NumberedSlots): EnclosureRing {
  return { ...RING_DEFAULTS, innerRadiusM: innerDiameterM / 2, pillarCount, pillar, numberedSlots };
}

/**
 * [HG] the central-pair midpoints of B, C and D form an equilateral triangle with sides of about 19.25 m. B and C
 * lie on its southern side and D is the apex. [EST] that side is drawn due east-west with B to the west, as it
 * looks on the published plans; its true bearing is not given.
 */
const TRIANGLE_SIDE_M = 19.25;
const HALF_SIDE_M = TRIANGLE_SIDE_M / 2;
const TRIANGLE_HEIGHT_M = 16.67;
/** [EST] the walker starts just inside D's southern wall, so D's centre is this far north of the origin. */
const D_NORTH_OF_START_M = 6;
const SOUTH_SIDE_M = TRIANGLE_HEIGHT_M - D_NORTH_OF_START_M;

const ENCLOSURES: readonly Enclosure[] = [
  {
    id: "D",
    name: "Enclosure D",
    centre: [0, -D_NORTH_OF_START_M],
    // [HG] maximum inner diameter about 14 m, 11 pillars in the wall. A DAI report gives 20 m west to east.
    // [S10] Pillar 43 stands beside a gap in the northern section of the wall, with Pillar 30 across the gap; it is
    // the north-western of the two, so it takes the slot nearest north-north-west. The gap itself is not drawn.
    // [EST] Pillar 33's slot (south-west): its place in the ring was not found in a source that could be read.
    rings: [ring(14, 11, PERIMETER_PILLAR, { 4: 43, 1: 33 })],
    // [HG] pedestals 20 to 30 cm high. [EST] spacing. [S10] Pillar 31 is the western and Pillar 18 the eastern
    // pillar, and both carry arms, hands, a belt and a loincloth in flat relief.
    centralPair: { pillar: CENTRAL_PILLAR_D, spacingM: 3.4, pedestalHeightM: 0.25, pillarNumbers: [31, 18], anthropomorphic: true },
  },
  {
    id: "C",
    name: "Enclosure C",
    centre: [HALF_SIDE_M, SOUTH_SIDE_M],
    // [HG] inner wall about 11 m across with 11 pillars; second wall about 17 m across with 8 pillars so far. A third is possible.
    // [TT] Pillar 27 is in Enclosure C. [EST] its ring and slot (inner ring, west).
    rings: [ring(11, 11, PERIMETER_PILLAR, { 2: 27 }), ring(17, 8)],
    // [HG] the pair stands nearer the wall than the centre. [EST] spacing; no pedestal drawn (the bases are cut from bedrock).
    centralPair: { pillar: CENTRAL_PILLAR, spacingM: 5, pedestalHeightM: 0 },
  },
  {
    id: "B",
    name: "Enclosure B",
    centre: [-HALF_SIDE_M, SOUTH_SIDE_M],
    // [HG] wall about 9 m across with nine pillars so far. Not fully excavated.
    rings: [ring(9, 9, SMALL_PERIMETER_PILLAR)],
    // [TT] Pillars 9 and 10 are the central pair, and Pillar 9's fox is on its western broad side.
    // [EST] that the fox faces its partner, which would make Pillar 9 the eastern pillar.
    centralPair: { pillar: SMALL_CENTRAL_PILLAR, spacingM: 2.6, pedestalHeightM: 0, pillarNumbers: [10, 9] },
  },
  {
    id: "A",
    name: "Enclosure A",
    // [EST] south-west of B, as on the published plans. Position and size are not given in [HG].
    centre: [-HALF_SIDE_M - 4, SOUTH_SIDE_M + 12],
    // [HG] four pillars exposed in the wall, floor not reached. [EST] diameter.
    rings: [ring(8, 4, SMALL_PERIMETER_PILLAR)],
    // [TT] Pillars 1 and 2 are the central pair. [EST] which stands west and which east.
    centralPair: { pillar: SMALL_CENTRAL_PILLAR, spacingM: 2.4, pedestalHeightM: 0, pillarNumbers: [1, 2] },
  },
];

export const GOBEKLI_TEPE_MODEL: WalkModel = {
  enclosures: ENCLOSURES,
  // Reaches the far side of Enclosure A from the start inside D.
  walkRadiusM: 36,
  note:
    "A schematic model of Enclosures A to D drawn from published dimensions, not a survey. Positions, wall heights and " +
    "pillar proportions are approximate, every enclosure is drawn as a circle on one level, and the only carvings sketched " +
    "are the arms, belts and loincloths of Enclosure D's central pillars.",
  sources: [
    { label: "Haklay & Gopher 2020, after the DAI excavation reports", url: "https://doi.org/10.1017/S0959774319000660" },
    { label: "Schmidt 2010", url: "https://doi.org/10.4312/dp.37.21" },
  ],
  hypotheses: GOBEKLI_TEPE_HYPOTHESES,
};
