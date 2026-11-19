/**
 * Schematic layout of the three main pyramids of Giza, in local metres from an arbitrary origin (the walker's start).
 * A diagram from published figures, not a survey. No real-world coordinates belong in this file: the only positions
 * are the distances between the three centres.
 *
 * [P]   = Petrie, W. M. F. 1883. The Pyramids and Temples of Gizeh. London: Field & Tuer. Read in the transcription
 *         at www.ronaldbirdsall.com/gizeh in 2026-11, text only: nothing was measured from its plates. The section
 *         (§) is given with each figure. Petrie works in inches, and they are kept here so that each figure can be
 *         found in his text; `inches` turns them into metres. He calls the pyramids of Khufu, Khafre and Menkaure the
 *         Great or First, the Second and the Third. An azimuth with a minus sign is west of true north.
 * [B]   = the transcription's correction to [P] §92 (S. Brabin): the direct distance from the First to the Third
 *         centre is 36856.7 inches where Petrie printed 36857.7. Only the check script uses it.
 * [EST] = estimated for this model. Not a published figure.
 *
 * The same figures appear in lib/theories/gizaFacts.ts (the base of 9068.8 inches and the turn of 3′43″): change both
 * or neither.
 *
 * Simplifications: the ground is one flat level (the plateau slopes, and the pyramids stand at different heights on
 * it), each core is a stack of level courses of one thickness, and each pyramid is a true square. Left out, because no
 * source that was read gives both a size and a position: the Sphinx, the temples and causeways, the boat pits, the
 * queens' pyramids ([P] §90 says their bases were not uncovered), the tombs, and everything inside the pyramids.
 */

import type { ModelSource } from "./enclosureModel";
import type { PyramidFigures } from "./pyramidModel";
import type { WalkScale } from "./walkScale";

const INCH_M = 0.0254;
const inches = (count: number) => count * INCH_M;
const arcminutes = (minutes: number, seconds: number) => minutes + seconds / 60;

/**
 * [P] §20: the casing is gone from the Great Pyramid but for stones at its foot, and the core masonry stands inside
 * the casing line by half of 9068.8 less 9001.5 inches, about 0.85 m, on each side. [EST] the same is drawn at the
 * other two, whose core bases were not found in a source that was read.
 */
const CORE_INSIDE_CASING_M = inches((9068.8 - 9001.5) / 2);

export const GIZA_PYRAMIDS: readonly PyramidFigures[] = [
  {
    id: "khufu",
    name: "Pyramid of Khufu",
    // [P] §25: mean casing base 9068.8 ± 0.5 inches; angle of the faces 51°52′ ± 2′; height 5776.0 ± 7.0 inches.
    casingBaseM: inches(9068.8),
    faceAngleDeg: 51 + 52 / 60,
    originalHeightM: inches(5776),
    // [P] §20: mean side of the core masonry at the base, 9001.5 inches.
    coreBaseM: inches(9001.5),
    // [P] §25: the present top is 5407.9 inches above the base at the north-east and 5409.2 at the south-west.
    presentHeightM: inches((5407.9 + 5409.2) / 2),
    // [P] §25: the top is not square: its sides lie 224.5, 214.1, 215.0 and 217.6 inches from the centre. The mean is drawn.
    presentTopSideM: inches((224.5 + 214.1 + 215 + 217.6) / 2),
    // [EST] one even thickness. [P] §32 says the courses vary and gives no count of them in its text.
    courseHeightM: 0.7,
    // [P] §21: mean azimuth of the casing sides, −3′43″.
    azimuthArcmin: -arcminutes(3, 43),
  },
  {
    id: "khafre",
    name: "Pyramid of Khafre",
    // [P] §66: mean base 8474.9 inches. §67: "probably 53°10′ ± 4′"; height 5664 ± 13 inches.
    casingBaseM: inches(8474.9),
    faceAngleDeg: 53 + 10 / 60,
    originalHeightM: inches(5664),
    coreBaseM: inches(8474.9) - 2 * CORE_INSIDE_CASING_M,
    // [EST] 136.4 m is the figure Wikipedia's article on the pyramid gives, without a citation. No survey of the
    // present top was read; [P] gives none.
    presentHeightM: 136.4,
    // [P] §68: the tenth course lies at 416 inches, so the lowest ten average 41.6 inches. [EST] that every course is as thick.
    courseHeightM: inches(41.6),
    // [P] §66: mean azimuth of the sides, −5′26″.
    azimuthArcmin: -arcminutes(5, 26),
    // [P] §66, §68: casing remains "on the upper part", a "cap of casing". [EST] the level it starts at: no figure was
    // read. Wikipedia's article says the top third, without a citation; the cap is drawn from 100 m up.
    casingStandsFromM: 100,
  },
  {
    id: "menkaure",
    name: "Pyramid of Menkaure",
    // [P] §80: mean base 4153.6 inches. §81: 51°0′ ± 10′ "the best conclusion"; height 2564 ± 15 inches (2580.8 ± 2
    // by the granite courses, which is not the figure drawn).
    casingBaseM: inches(4153.6),
    faceAngleDeg: 51,
    originalHeightM: inches(2564),
    coreBaseM: inches(4153.6) - 2 * CORE_INSIDE_CASING_M,
    // [EST] 61 m is the figure Wikipedia's article on the pyramid gives, without a citation. [P] gives none.
    presentHeightM: 61,
    // [P] §82: at the north-east the fortieth course reaches 1383.5 inches. [EST] that every course is as thick.
    courseHeightM: inches(1383.5 / 40),
    // [P] §80: mean azimuth of the sides, +14′3″: east of north, the opposite way to the other two.
    azimuthArcmin: arcminutes(14, 3),
    // [P] §82: the granite casing, the lower 16 courses, ceased at 645.2 inches, a quarter of the height.
    darkCasingToM: inches(645.2),
  },
];

/**
 * [P] §92: the distances between the centres, "measured on parallels inclined −5′ to true N". The section prints the
 * distances and not which way they run. That the Second lies south-west of the First and the Third south-west of the
 * Second is stated, without a citation, in Wikipedia's article "Giza pyramid complex" (read 2026-11); no survey text
 * that was read says it in words.
 */
export const GIZA_CENTRES_FROM_KHUFU: Readonly<Record<string, { southM: number; westM: number }>> = {
  khufu: { southM: 0, westM: 0 },
  khafre: { southM: inches(13931.6), westM: inches(13165.8) },
  menkaure: { southM: inches(29102), westM: inches(22616) },
};
/** [P] §92: the axes those distances are measured on are turned this far west of true north, in arcminutes. */
export const GIZA_SURVEY_AXES_ARCMIN = -5;

/** [P] §92 and [B]: the straight distances between the centres, which the model does not use and the check compares. */
export const GIZA_DIRECT_DISTANCES_M = { khufuToKhafre: inches(19168.4), khufuToMenkaure: inches(36856.7) };

/**
 * [EST] where the walker starts, from the centre of Khufu's pyramid: on open ground south of Khafre's pyramid, with
 * that pyramid close on the left and Khufu's beyond it to the right. A place to stand, not a find.
 */
export const GIZA_WALKER_START_FROM_KHUFU = { southM: 560, westM: 200 };

/** [EST] reaches round the far side of every pyramid from the start. */
export const GIZA_WALK_RADIUS_M = 820;

/**
 * [EST] the site is some 900 m from corner to corner, against 30 m at Göbekli Tepe: the walker moves five times
 * faster, may fly above the tallest pyramid, and the light, the haze and the horizon reach ten times further.
 */
export const GIZA_WALK_SCALE: Partial<WalkScale> = { speedFactor: 5, highestCeilingM: 400, shadowReachM: 900, backdropFactor: 10, markerScale: 25 };

const PETRIE = "Petrie 1883, The Pyramids and Temples of Gizeh";
const PETRIE_ONLINE = "https://www.ronaldbirdsall.com/gizeh/petrie";

export const GIZA_SOURCES = {
  khufu: { label: `${PETRIE}, chapter 6`, url: `${PETRIE_ONLINE}/c6.html` },
  khafre: { label: `${PETRIE}, chapter 8`, url: `${PETRIE_ONLINE}/c8.html` },
  menkaure: { label: `${PETRIE}, chapter 10`, url: `${PETRIE_ONLINE}/c10.html` },
  positions: { label: `${PETRIE}, chapter 13`, url: `${PETRIE_ONLINE}/c13.html` },
} as const satisfies Record<string, ModelSource>;

export const GIZA_MODEL_NOTE =
  "A schematic model of the three main pyramids, drawn from Petrie's survey of 1880 to 1882, not a survey itself. Bases, " +
  "slopes, the first heights, the distances between the pyramids and the Great Pyramid's present top are his figures. " +
  "The present heights of the other two, the level where Khafre's casing begins, how far their cores stand inside the " +
  "casing line and the even thickness of every course are approximate. The ground is drawn flat. The Sphinx, the temples, " +
  "causeways, boat pits, queens' pyramids and tombs, and everything inside the pyramids, are left out for want of a source " +
  "that gives their size and place. The horizon is the plain backdrop of the other models, not Giza's. You move five " +
  "times faster here than a walker does.";
