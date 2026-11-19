/**
 * Schematic layout of Enclosures A to D at Göbekli Tepe, in local metres from an arbitrary origin (the walker's start).
 * A diagram from published figures, not a survey. No real-world coordinates belong in this file.
 *
 * [HG] = Haklay & Gopher 2020, "Geometry and Architectural Planning at Göbekli Tepe, Turkey", Cambridge
 *        Archaeological Journal 30(2), doi:10.1017/S0959774319000660, which restates the DAI excavation reports
 *        (Schmidt; Dietrich; Notroff). Every [HG] figure here was checked against the article itself (pp. 344-350)
 *        in 2026-11. Figures were read from its text, not measured from its plans.
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

/** [HG] peripheral pillars are 3 to 4 m high ([S10]: 3.5 m on average). [EST] every other proportion. */
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
 * [HG] p. 350: in B, C and D the middle points between the southern faces of the two central pillars lie within
 * 25 to 28 cm of the corners of an equilateral triangle with sides of about 19.25 m. B and C lie on its southern side
 * and D is the apex. [EST] that side is drawn due east-west with B to the west, as it looks on the published plans;
 * its true bearing is not given. Each corner is drawn at the middle of its pair, not at the pillars' southern faces.
 */
const TRIANGLE_SIDE_M = 19.25;
const HALF_SIDE_M = TRIANGLE_SIDE_M / 2;
const TRIANGLE_HEIGHT_M = 16.67;
/**
 * [EST] the walker starts just inside D's southern wall, in the gap drawn there, so D's centre is this far north of
 * the origin: far enough back that the heads of the 5.5 m central pair are in view on the first frame.
 */
const D_NORTH_OF_START_M = 6.9;
const SOUTH_SIDE_M = TRIANGLE_HEIGHT_M - D_NORTH_OF_START_M;

/** [EST] narrower than the 3.5 m between the two pillars that flank it, so a stub of wall stands beside each. */
const D_NORTH_GAP_WIDTH_M = 2.2;

const ENCLOSURES: readonly Enclosure[] = [
  {
    id: "D",
    name: "Enclosure D",
    centre: [0, -D_NORTH_OF_START_M],
    // [HG] p. 347: "oval shape", maximum inner diameter about 14 m, 11 pillars in the wall so far. No shorter
    // diameter is given there or in [S10] (circles "between 10 and 20 metres"), so the circle drawn is as wide as the
    // oval's long axis.
    // [S10] Pillar 43 stands beside a gap in the northern section of the wall, with Pillar 30 across the gap; it is
    // the north-western of the two, so it takes the slot nearest north-north-west, and the wall is opened between
    // that slot and the next, which stands due north. [EST] the gap's width, its exact bearing, and that the bench
    // runs on across it. Pillar 30 is not numbered here because it carries no landmark.
    // [EST] Pillar 33's slot (south-west): its place in the ring was not found in a source that could be read.
    rings: [{ ...ring(14, 11, PERIMETER_PILLAR, { 4: 43, 1: 33 }), openings: [{ afterSlot: 4, widthM: D_NORTH_GAP_WIDTH_M }] }],
    // [HG] pedestals 20 to 30 cm high. [EST] spacing. [S10] Pillar 31 is the western and Pillar 18 the eastern
    // pillar, and both carry arms, hands, a belt and a loincloth in flat relief.
    centralPair: { pillar: CENTRAL_PILLAR_D, spacingM: 3.4, pedestalHeightM: 0.25, pillarNumbers: [31, 18], anthropomorphic: true },
  },
  {
    id: "C",
    name: "Enclosure C",
    centre: [HALF_SIDE_M, SOUTH_SIDE_M],
    // [HG] pp. 345-346: inner wall about 11 m "maximum interior diameter" with 11 pillars, its bench an "oval curve";
    // second wall about 17 m inner diameter with 8 pillars so far. A third is possible. No shorter diameter is given.
    // [TT] Pillar 27 is in Enclosure C. [EST] its ring and slot (inner ring, west).
    rings: [ring(11, 11, PERIMETER_PILLAR, { 2: 27 }), ring(17, 8)],
    // [HG] p. 349: the inner faces of the pair are about 2.8 m from the centre point, and as far again from the inner
    // face of the wall. So the faces are 5.6 m apart; the spacing here is centre to centre, one [EST] thickness more.
    // [HG] pp. 345, 347: the pair stands on rock-cut platform-like bases; the 20 to 30 cm is given with D's "as in
    // Enclosure C". The pillars stand off-centre on their bases, nearer the wall, which is not drawn.
    centralPair: { pillar: CENTRAL_PILLAR, spacingM: 5.6 + CENTRAL_PILLAR.thicknessM, pedestalHeightM: 0.25 },
  },
  {
    id: "B",
    name: "Enclosure B",
    centre: [-HALF_SIDE_M, SOUTH_SIDE_M],
    // [HG] p. 345: wall about 9 m across with nine pillars so far. Not fully excavated. A possible second wall about
    // 14 m across, so far without pillars, is not drawn.
    rings: [ring(9, 9, SMALL_PERIMETER_PILLAR)],
    // [TT] Pillars 9 and 10 are the central pair, and Pillar 9's fox is on its western broad side.
    // [HG] p. 345: both pillars carry their fox on the inner side, which makes Pillar 9 the eastern pillar.
    centralPair: { pillar: SMALL_CENTRAL_PILLAR, spacingM: 2.6, pedestalHeightM: 0, pillarNumbers: [10, 9] },
  },
  {
    id: "A",
    name: "Enclosure A",
    // [EST] south-west of B, as on the published plans. Position and size are not given in [HG].
    centre: [-HALF_SIDE_M - 4, SOUTH_SIDE_M + 12],
    // [HG] four pillars exposed in the wall, floor not reached. [EST] diameter.
    rings: [ring(8, 4, SMALL_PERIMETER_PILLAR)],
    // [TT] Pillars 1 and 2 are the central pair. [HG] p. 347: Pillar 2 is the eastern one, and may not stand in its
    // original position.
    centralPair: { pillar: SMALL_CENTRAL_PILLAR, spacingM: 2.4, pedestalHeightM: 0, pillarNumbers: [1, 2] },
  },
];

export const GOBEKLI_TEPE_MODEL: WalkModel = {
  enclosures: ENCLOSURES,
  // Reaches the far side of Enclosure A from the start inside D.
  walkRadiusM: 36,
  note:
    "A schematic model of Enclosures A to D drawn from published dimensions, not a survey. Positions, wall heights, " +
    "pillar proportions and the width of the gap in Enclosure D's northern wall are approximate, every enclosure is drawn " +
    "as a circle on one level, and the only carvings sketched are the arms, hands, belts and loincloths of Enclosure D's " +
    "central pillars.",
  sources: [
    { label: "Haklay & Gopher 2020, after the DAI excavation reports", url: "https://doi.org/10.1017/S0959774319000660" },
    { label: "Schmidt 2010", url: "https://doi.org/10.4312/dp.37.21" },
  ],
  hypotheses: GOBEKLI_TEPE_HYPOTHESES,
};
