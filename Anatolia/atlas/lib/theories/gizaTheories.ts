/**
 * Giza: its open questions and the theories that try to answer them, from the Egyptologists' account to the
 * ideas furthest from it. Each stands where the evidence listed under it puts it. Wording stays level.
 */

import { BAUVAL_GILBERT_1994, GIZA_EVIDENCE, HANCOCK_1995 } from "./gizaEvidence";
import { AERA_LOST_CITY, BRIER_2007, GIZA_FACTS, GIZA_SITE_IDS, NOVA_BUILDERS_1997 } from "./gizaFacts";
import { firstStatus } from "./theoryStatus";
import type { OpenQuestion, Theory, TheoryRecords, TheorySource } from "./theoryTypes";

const SEEDED_ON = "2026-11-19";

const DUNN_1998: TheorySource = {
  citation: "Dunn, C. 1998. The Giza Power Plant: Technologies of Ancient Egypt. Santa Fe: Bear & Company.",
  kind: "popular-book",
};

const BUILT_FOR_KHUFU = ["giza-evidence-merer-logbook", "giza-evidence-gang-graffiti", "giza-evidence-workers-town", "giza-evidence-radiocarbon-in-old-kingdom"];

const THEORIES: readonly Theory[] = [
  {
    id: "giza-khufu-tomb-state-workforce",
    title: "Built as Khufu's tomb by an organised state workforce",
    claim:
      "The Great Pyramid was built in the Fourth Dynasty as the tomb of King Khufu, within his reign, by crews of Egyptian workers who were housed, fed and organised by the state. They were not slaves.",
    proponents: ["Mark Lehner", "Zahi Hawass", "Egyptologists generally"],
    claimSources: [NOVA_BUILDERS_1997, AERA_LOST_CITY],
    siteIds: GIZA_SITE_IDS,
    evidenceFor: [...BUILT_FOR_KHUFU, "giza-evidence-workers-cemetery", "giza-evidence-coffer-is-a-sarcophagus"],
    evidenceAgainst: ["giza-evidence-radiocarbon-offset"],
    wouldSettle:
      "Little is left open about who built it and when. Open points are the burial itself, of which the sources read here record no remains, and the gap of a century or more between the radiocarbon dates and the historical ones.",
    ...firstStatus(
      SEEDED_ON,
      "well-supported",
      "A logbook of Khufu's reign, builders' marks inside the pyramid, a dated workers' town and cemetery, and radiocarbon dates are independent of one another and agree. The radiocarbon dates run somewhat older than the historical ones.",
    ),
  },
  {
    id: "giza-external-ramps",
    title: "Blocks raised on ramps built against the outside",
    claim: "The blocks were dragged up on sledges over ramps built against the pyramid: one long straight ramp, a ramp winding round the faces, or some mix of the two.",
    proponents: ["Egyptologists generally, in several versions; set out by Bob Brier (2007)"],
    claimSources: [BRIER_2007, NOVA_BUILDERS_1997],
    siteIds: GIZA_SITE_IDS,
    evidenceFor: ["giza-evidence-hatnub-ramp", "giza-evidence-nova-block-trials", "giza-evidence-wet-sand-sledge"],
    evidenceAgainst: ["giza-evidence-straight-ramp-too-large", "giza-evidence-spiral-ramp-hides-corners"],
    wouldSettle: "The remains of a construction ramp at Giza itself, or of its dumped fill, large enough to have reached the upper courses; or a text of the time that describes the method.",
    ...firstStatus(
      SEEDED_ON,
      "contested",
      "Ramps and sledges of the period are attested by a find and by trials. Which form of ramp could have served the upper part of the pyramid is disputed, with a published objection to each of the two outside forms.",
    ),
  },
  {
    id: "giza-internal-ramp",
    title: "An internal spiral ramp for the upper two thirds",
    claim:
      "A straight outside ramp served the lowest third of the pyramid. Above that the blocks went up a ramp built inside the pyramid, turning at openings in the corners. The outside ramp was then taken down and its blocks used in the upper part.",
    proponents: ["Jean-Pierre Houdin", "Bob Brier"],
    claimSources: [BRIER_2007],
    siteIds: GIZA_SITE_IDS,
    evidenceFor: ["giza-evidence-microgravity-image", "giza-evidence-corner-notch", "giza-evidence-straight-ramp-too-large", "giza-evidence-spiral-ramp-hides-corners"],
    evidenceAgainst: ["giza-evidence-internal-ramp-untested"],
    wouldSettle: "A survey that does no damage, by microgravity, infrared or a like method, showing a corridor spiralling up inside the pyramid, or showing solid masonry where the model needs one.",
    ...firstStatus(
      SEEDED_ON,
      "weakly-supported",
      "It answers the objections to outside ramps and has two suggestive observations behind it. In the account read here it had not been tested by a survey made for the purpose.",
    ),
  },
  {
    id: "giza-power-plant",
    title: "The Great Pyramid as a power plant",
    claim:
      "The Great Pyramid was a machine and not a tomb: it resonated with the vibrations of the Earth and turned them into usable power. Dunn, a machinist, also holds that the stonework shows machining methods since lost.",
    proponents: ["Christopher Dunn"],
    claimSources: [DUNN_1998],
    siteIds: GIZA_SITE_IDS,
    evidenceFor: ["giza-evidence-petrie-drill-pressure"],
    evidenceAgainst: [
      "giza-evidence-stocks-sand-sawing",
      "giza-evidence-stocks-aswan-tests",
      "giza-evidence-obelisk-trials",
      "giza-evidence-obelisk-raised-1999",
      "giza-evidence-coffer-is-a-sarcophagus",
      "giza-evidence-gang-graffiti",
    ],
    wouldSettle:
      "A find of the machinery itself or its traces: conductors, deposits left by the process, or tools of the kind proposed. On the machining, a measured comparison of the ancient tool marks with marks made by copper, sand and stone tools in trials.",
    ...firstStatus(
      SEEDED_ON,
      "unsupported-so-far",
      "The book offers an argument. The sources read here report no find of machinery or of advanced tools, and trials have cut and raised granite with copper, sand, ropes and levers, with difficulty. Petrie's remarks on drilling pressure stand as an open puzzle.",
    ),
  },
  {
    id: "giza-orion-correlation",
    title: "The three pyramids map Orion's Belt",
    claim: "The three large pyramids of Giza were laid out to copy the three stars of Orion's Belt on the ground.",
    proponents: ["Robert Bauval", "Adrian Gilbert"],
    claimSources: [BAUVAL_GILBERT_1994],
    siteIds: GIZA_SITE_IDS,
    evidenceFor: ["giza-evidence-belt-pattern"],
    evidenceAgainst: ["giza-evidence-map-must-be-inverted", "giza-evidence-belt-angle-mismatch"],
    wouldSettle: "A text or plan of the time that names the intent. Short of that, a test of how closely the layout fits the Belt, with the direction of the map fixed beforehand, against how well chance layouts fit.",
    ...firstStatus(
      SEEDED_ON,
      "weakly-supported",
      "The likeness of the pattern is a real observation and the argument is set out at length. Two astronomers have published objections to the fit, and no text of the time states such a plan.",
    ),
  },
  {
    id: "giza-older-lost-civilisation",
    title: "A plan from a lost civilisation of the Ice Age",
    claim:
      "An advanced civilisation of the last Ice Age was lost, and its survivors passed knowledge to later peoples. At Giza, the Sphinx and the plan of the pyramids go back to about 10,500 BC, thousands of years before the pharaohs.",
    proponents: ["Graham Hancock", "Robert Bauval"],
    claimSources: [HANCOCK_1995],
    siteIds: GIZA_SITE_IDS,
    evidenceFor: ["giza-evidence-sky-of-10500-bc"],
    evidenceAgainst: [...BUILT_FOR_KHUFU, "giza-evidence-belt-angle-mismatch"],
    wouldSettle: "Dated material at Giza from the proposed time: worked stone, tools, organic remains or settlement layers of the eleventh millennium BC.",
    ...firstStatus(
      SEEDED_ON,
      "unsupported-so-far",
      "The case is an argument from the pattern of the sky. The sources read here report no dated material of that age from Giza; what has been dated there belongs to the third millennium BC.",
    ),
  },
];

const QUESTIONS: readonly OpenQuestion[] = [
  {
    id: "giza-how-were-the-blocks-raised",
    question: "How were the blocks, among them granite beams of tens of tons, raised to their places?",
    siteIds: GIZA_SITE_IDS,
    factIds: ["giza-fact-block-supply-rate", "giza-fact-kings-chamber-roof", "giza-fact-heaviest-beams", "giza-fact-hatnub-ramp"],
    theoryIds: ["giza-external-ramps", "giza-internal-ramp"],
  },
  {
    id: "giza-who-built-it-and-when",
    question: "Who built the Great Pyramid, and when?",
    siteIds: GIZA_SITE_IDS,
    factIds: ["giza-fact-merer-logbook", "giza-fact-gang-graffiti", "giza-fact-workers-town", "giza-fact-workers-cemetery", "giza-fact-radiocarbon-dates"],
    theoryIds: ["giza-khufu-tomb-state-workforce", "giza-older-lost-civilisation"],
  },
  {
    id: "giza-what-was-it-for",
    question: "What was the Great Pyramid built for?",
    siteIds: GIZA_SITE_IDS,
    factIds: ["giza-fact-granite-coffer", "giza-fact-kings-chamber-roof"],
    theoryIds: ["giza-khufu-tomb-state-workforce", "giza-power-plant"],
  },
  {
    id: "giza-why-this-layout-and-alignment",
    question: "Why are the pyramids laid out as they are, and how was the Great Pyramid set so close to true north?",
    siteIds: GIZA_SITE_IDS,
    factIds: ["giza-fact-petrie-alignment", "giza-fact-alignment-later-surveys", "giza-fact-base-sides"],
    theoryIds: ["giza-orion-correlation"],
  },
];

export const GIZA_RECORDS: TheoryRecords = {
  facts: GIZA_FACTS,
  evidence: GIZA_EVIDENCE,
  theories: THEORIES,
  questions: QUESTIONS,
};
