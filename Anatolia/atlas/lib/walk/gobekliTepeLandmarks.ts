/**
 * Landmark cards for Göbekli Tepe. Published facts only, each with the source it was read in; an interpretation is
 * worded as one and attributed. No real-world coordinates belong in this file: positions are local walk metres.
 *
 * In the model a landmark stands at the pillar or enclosure it names (gobekliTepeLayout.ts). In the photographs it
 * stands where PHOTOGRAPHS_POSITIONS_M says, and a landmark without a row there is simply not shown.
 */

import type { ModelSource } from "./enclosureModel";
import type { Landmark, SiteLandmarks } from "./landmarks";
import type { Vec3 } from "./walkMovement";

const TEPE_TELEGRAMS = "https://www.dainst.blog/the-tepe-telegrams";
const SCHMIDT_2010: ModelSource = { label: "Schmidt 2010, Documenta Praehistorica 37", url: "https://doi.org/10.4312/dp.37.21" };
const DIETRICH_2019: ModelSource = { label: "Dietrich et al. 2019, PLOS ONE 14(5); Schmidt 2010", url: "https://doi.org/10.1371/journal.pone.0215214" };
const PETERS_SCHMIDT_2004: ModelSource = {
  label: "Peters & Schmidt 2004, Anthropozoologica 39(1)",
  url: "https://sciencepress.mnhn.fr/sites/default/files/articles/pdf/az2004n1a13.pdf",
};
const PILLAR_43_NOTE: ModelSource = {
  label: "Dietrich 2016, The Tepe Telegrams (DAI); Schmidt 2010",
  url: `${TEPE_TELEGRAMS}/2016/10/14/of-animals-and-a-headless-man-gobekli-tepe-pillar-43/`,
};
const ENCLOSURE_C_NOTE: ModelSource = {
  label: "Dietrich 2016, The Tepe Telegrams (DAI); Schmidt 2010",
  url: `${TEPE_TELEGRAMS}/2016/07/15/boars-in-gobekli-tepes-enclosure-c-just-a-story-of-hunters-and-prey/`,
};
const ENCLOSURE_B_NOTE: ModelSource = {
  label: "Dietrich 2017, The Tepe Telegrams (DAI)",
  url: `${TEPE_TELEGRAMS}/2017/02/03/enclosure-b-a-short-overview/`,
};
const ENCLOSURE_A_NOTE: ModelSource = {
  label: "Dietrich 2017, The Tepe Telegrams (DAI)",
  url: `${TEPE_TELEGRAMS}/2017/01/05/enclosure-a-a-short-overview/`,
};

const LANDMARKS: readonly Landmark[] = [
  {
    id: "enclosure-d",
    name: "Enclosure D",
    enclosureId: "D",
    description:
      "The best preserved of the excavated enclosures. Eleven pillars stand in its ring wall around two central pillars about 5.5 m tall, " +
      "which are set in pedestals cut from the smoothed bedrock floor. Its carvings are the most varied on the site, with birds, especially vultures, prominent. " +
      "A gap in the northern part of the wall is where the excavator thought a twelfth pillar had stood.",
    source: DIETRICH_2019,
  },
  {
    id: "pillar-18",
    name: "Pillar 18, the eastern central pillar",
    enclosureId: "D",
    pillarNumber: 18,
    description:
      "The eastern of Enclosure D's two central pillars, 5.4 m tall. Arms run down its sides in flat relief to hands and fingers just above a belt with a buckle and H- and C-shaped signs; " +
      "a loincloth hangs from the belt, and the hind legs and tail on it look like a fox pelt. It holds a fox in the crook of its elbow and wears a necklace of a crescent, a disc and a motif that is not understood. " +
      "The excavator read the T-shaped pillars as stylised human-like beings; who they stand for is not known.",
    source: SCHMIDT_2010,
  },
  {
    id: "pillar-31",
    name: "Pillar 31, the western central pillar",
    enclosureId: "D",
    pillarNumber: 31,
    description:
      "The western central pillar, 5.3 m tall. Like its partner it has arms, hands and fingers in flat relief, a belt with a buckle and a loincloth that looks like a fox pelt. " +
      "It wears a necklace in the form of a bucranium, a horned cattle skull. The H- and C-shaped signs on the belt are reported only for the eastern pillar.",
    source: SCHMIDT_2010,
  },
  {
    id: "pillar-43",
    name: "Pillar 43, the Vulture Stone",
    enclosureId: "D",
    pillarNumber: 43,
    description:
      "Stands in the ring wall on the north-west side, beside the gap in its northern section. Its western broad side is covered in relief: a large vulture with a wing stretched towards a disc or sphere, " +
      "a second bird, a snake and H-shaped signs, and on the shaft a large scorpion and a headless man. Three box-like objects with arched tops run along the head. " +
      "The excavators have read the disc as the sun or moon, an egg, or the man's head, and connect the scene with Neolithic death ritual; they say its meaning cannot be settled. " +
      "Readings of the pillar as a star map or the record of a comet are disputed by the excavation team.",
    source: PILLAR_43_NOTE,
  },
  {
    id: "pillar-33",
    name: "Pillar 33",
    enclosureId: "D",
    pillarNumber: 33,
    description:
      "A pillar of Enclosure D's ring wall. One side shows two cranes with signs the excavators call pictograms and parallel lines that represent snakes. " +
      "It is one of the few pillars whose snakes do not move downwards. Its place in the ring is an estimate in this model.",
    source: PETERS_SCHMIDT_2004,
  },
  {
    id: "enclosure-c",
    name: "Enclosure C",
    enclosureId: "C",
    description:
      "Boars dominate the carvings and sculptures of this enclosure, which has more than one ring wall. Its two central pillars stand on pedestals cut from the bedrock. " +
      "It is the only enclosure where a clear entrance was found: a passage from the south marked by a huge U-shaped stone and a slab with a door hole, later blocked by a wall.",
    source: ENCLOSURE_C_NOTE,
  },
  {
    id: "pillar-27",
    name: "Pillar 27",
    enclosureId: "C",
    pillarNumber: 27,
    description:
      "A predator in high relief moves down the shaft, cut from the same block as the pillar; Klaus Schmidt called it a masterpiece of stonemasonry. " +
      "Below it a much smaller boar lies on its side in flat relief, which has been read as a hunting scene with the boar already dead. " +
      "Its place in the ring is an estimate in this model.",
    source: ENCLOSURE_C_NOTE,
  },
  {
    id: "enclosure-b",
    name: "Enclosure B",
    enclosureId: "B",
    description:
      "A round building nearly 10 m across inside, with two central pillars and eight pillars found in the ring wall by 2017, most of them plain. " +
      "Foxes on the central pillars dominate its few carvings. Between those pillars lies a terrazzo floor, where Enclosures C and D have smoothed bedrock, " +
      "and a stone bowl fed by a small channel is set into it in front of Pillar 9.",
    source: ENCLOSURE_B_NOTE,
  },
  {
    id: "pillar-9",
    name: "Pillar 9",
    enclosureId: "B",
    pillarNumber: 9,
    description:
      "One of Enclosure B's two central pillars. A fox about 110 cm long is carved on its western broad side, and a stone bowl was found set into the floor in front of it. " +
      "Which of the pair stands east and which west is an estimate in this model.",
    source: ENCLOSURE_B_NOTE,
  },
  {
    id: "pillar-10",
    name: "Pillar 10",
    enclosureId: "B",
    pillarNumber: 10,
    description:
      "The other central pillar of Enclosure B. Its fox matches the one on Pillar 9 in position and size. " +
      "Below the fox are shallow engravings of a boar and three dogs, probably a hunting scene added later.",
    source: ENCLOSURE_B_NOTE,
  },
  {
    id: "enclosure-a",
    name: "Enclosure A",
    enclosureId: "A",
    description:
      "The first enclosure excavated, from 1996. Its plan is closer to a rectangle than a circle, although this model draws it round, and it may be a little younger than Enclosures C and D. " +
      "It is not fully excavated: four pillars are known around the central pair. Snakes are the animal carved most often here.",
    source: ENCLOSURE_A_NOTE,
  },
  {
    id: "pillar-1",
    name: "Pillar 1",
    enclosureId: "A",
    pillarNumber: 1,
    description:
      "A central pillar of Enclosure A. One broad side carries a net-like pattern, possibly of snakes, with a ram. " +
      "The front has a vertical groove with five snakes in low relief, which may show a stole-like garment. " +
      "Which of the pair stands east and which west is an estimate in this model.",
    source: ENCLOSURE_A_NOTE,
  },
  {
    id: "pillar-2",
    name: "Pillar 2",
    enclosureId: "A",
    pillarNumber: 2,
    description:
      "The other central pillar of Enclosure A. One side shows a bull, a fox and a crane one above another, and the narrow back a bucranium between two raised bands. " +
      "The excavators think it was moved in antiquity, so that its original back became its front.",
    source: ENCLOSURE_A_NOTE,
  },
];

/**
 * THE TABLE TO FILL for the photographs source: landmark id -> [x, y, z] in the metres the walker moves in, that is
 * after the site's splat alignment in walkSites.ts (three.js axes: the walker starts at [0, eye height, 0] looking
 * down -z, with +x to their right and +y up from the floor). Give the point a visitor looks at, about eye height on
 * the stone. Round to three decimals at most. Leave a landmark out and it is not shown. Never guess one.
 *
 * Example row:  "pillar-43": [3.2, 1.6, -7.5],
 */
// Triangulated from the photographs (data/splat/_diagnose/landmarks), at splat scale 5.5. Pillar 43 is placed by
// its position in the ring: no photograph shows its carved face. Recompute if the alignment in walkSites.ts changes.
const PHOTOGRAPHS_POSITIONS_M: Readonly<Record<string, Vec3>> = {
  "enclosure-d": [20.53, -3.46, -17.48],
  "pillar-18": [20.12, -3.36, -14.83],
  "pillar-31": [20.95, -3.56, -20.14],
  "pillar-43": [25.28, -3.20, -20.53],
  "enclosure-c": [2.11, -6.06, -10.91],
  "pillar-27": [4.38, -5.78, -13.91],
  "enclosure-b": [3.67, -3.53, -28.72],
  "enclosure-a": [-8.21, -3.51, -28.53],
};

export const GOBEKLI_TEPE_LANDMARKS: SiteLandmarks = { landmarks: LANDMARKS, photographsPositionsM: PHOTOGRAPHS_POSITIONS_M };
