/**
 * Text for the landmark cards at Giza: one for each pyramid the model draws. Measurements are Petrie's, stated as his;
 * `placeId` names a pyramid of gizaLayout.ts. There are no photographs, so no positions for them.
 */

import { GIZA_SOURCES } from "./gizaLayout";
import type { Landmark, SiteLandmarks } from "./landmarks";

const LANDMARKS: readonly Landmark[] = [
  {
    id: "khufu",
    name: "Pyramid of Khufu, the Great Pyramid",
    enclosureId: "khufu",
    placeId: "khufu",
    description:
      "Petrie's survey of 1880 to 1882 measured the casing base at a mean of 9068.8 inches a side, about 230.35 m, and the slope of the faces at 51°52′, which gives a first height of 5776 inches, about 146.7 m. " +
      "The casing is gone but for stones at the foot. The core that stands rises to about 137.4 m and ends in a flat top some 11 m across. " +
      "Its sides are turned a mean of 3′43″ anticlockwise from the cardinal directions.",
    source: GIZA_SOURCES.khufu,
  },
  {
    id: "khafre",
    name: "Pyramid of Khafre, the Second Pyramid",
    enclosureId: "khafre",
    placeId: "khafre",
    description:
      "Petrie measured the base at a mean of 8474.9 inches a side, about 215.3 m, and put the slope of the faces at about 53°10′, which gives a first height of 5664 inches, about 143.9 m. " +
      "Casing still stands on the upper part. He records the lowest course of casing as granite and the upper part as limestone. " +
      "Its sides are turned a mean of 5′26″ anticlockwise from the cardinal directions.",
    source: GIZA_SOURCES.khafre,
  },
  {
    id: "menkaure",
    name: "Pyramid of Menkaure, the Third Pyramid",
    enclosureId: "menkaure",
    placeId: "menkaure",
    description:
      "Petrie measured the base at a mean of 4153.6 inches a side, about 105.5 m, and put the slope of the faces at about 51°, which gives a first height of 2564 inches, about 65.1 m. " +
      "The lowest sixteen courses of casing were granite, reaching a quarter of the height. " +
      "Its sides are turned a mean of 14′3″ clockwise from the cardinal directions, the opposite way to the other two.",
    source: GIZA_SOURCES.menkaure,
  },
];

export const GIZA_LANDMARKS: SiteLandmarks = { landmarks: LANDMARKS, photographsPositionsM: {} };
