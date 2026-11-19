/**
 * Giza: the evidence entries its theories list, for or against. Experiments are entries of kind "experiment",
 * so a claim that something could not be done stands beside the trials that bear on it.
 */

import { AERA_LOST_CITY, BRIER_2007, KOCH_PROJECT_1999, LIVERPOOL_2018, NOVA_BUILDERS_1997, PETRIE_INSIDE, PETRIE_METHODS, TALLET_2017 } from "./gizaFacts";
import type { EvidenceEntry, TheorySource } from "./theoryTypes";

export const FALL_2014: TheorySource = {
  citation:
    "Fall, A., Weber, B., Pakpour, M., Lenoir, N., Shahidzadeh, N., Fiscina, J., Wagner, C. & Bonn, D. 2014. Sliding Friction on Wet and Dry Sand. Physical Review Letters 112: 175502. " +
    "The link to Egyptian sledges is drawn in the University of Amsterdam's release of 29 April 2014.",
  kind: "peer-reviewed-paper",
  url: "https://doi.org/10.1103/PhysRevLett.112.175502",
};
export const STOCKS_2001: TheorySource = {
  citation: "Stocks, D. A. 2001. Testing ancient Egyptian granite-working methods in Aswan, Upper Egypt. Antiquity 75(287): 89–94.",
  kind: "peer-reviewed-paper",
  url: "https://www.cambridge.org/core/journals/antiquity/article/abs/testing-ancient-egyptian-graniteworking-methods-in-aswan-upper-egypt/35CC66DD0DEB499F1C6E805C1347BF68",
};
export const NOVA_CUTTING_GRANITE: TheorySource = {
  citation: "NOVA Online. Secrets of Lost Empires: Pharaoh's Obelisk, slide 5, Cutting Granite with Sand. WGBH/PBS.",
  kind: "other",
  url: "https://www.pbs.org/wgbh/nova/lostempires/obelisk/cutting05.html",
};
export const NOVA_OBELISK_1995: TheorySource = {
  citation: "NOVA Online. Mysteries of the Nile: Raising the Obelisk, First Attempt. WGBH/PBS.",
  kind: "other",
  url: "https://www.pbs.org/wgbh/nova/egypt/raising/first.html",
};
export const NOVA_OBELISK_1999: TheorySource = {
  citation: "Tyson, P. 1999. NOVA Online. Mysteries of the Nile, dispatch of 12 September 1999. WGBH/PBS.",
  kind: "other",
  url: "https://www.pbs.org/wgbh/nova/egypt/dispatches/99091202.html",
};
export const KRUPP_1997: TheorySource = {
  citation: "Krupp, E. C. 1997. Pyramid Marketing Schemes. Sky & Telescope 93(2): 64.",
  kind: "other",
};
export const FAIRALL_1999: TheorySource = {
  citation: "Fairall, A. 1999. Precession and the layout of the ancient Egyptian pyramids. Astronomy & Geophysics 40(3): 3.4.",
  kind: "other",
  url: "https://doi.org/10.1093/astrog/40.3.3.4",
};
export const BAUVAL_GILBERT_1994: TheorySource = {
  citation: "Bauval, R. & Gilbert, A. 1994. The Orion Mystery: Unlocking the Secrets of the Pyramids. London: Heinemann.",
  kind: "popular-book",
};
export const HANCOCK_1995: TheorySource = {
  citation: "Hancock, G. 1995. Fingerprints of the Gods: The Evidence of Earth's Lost Civilization. New York: Crown.",
  kind: "popular-book",
};

export const GIZA_EVIDENCE: readonly EvidenceEntry[] = [
  {
    id: "giza-evidence-merer-logbook",
    summary: "A logbook written in Khufu's reign records crews shipping limestone to the “Horizon of Khufu”. Tallet takes the loads to be casing stone for the Great Pyramid; the logbook does not say what the stone was for.",
    kind: "text",
    factId: "giza-fact-merer-logbook",
    source: TALLET_2017,
  },
  {
    id: "giza-evidence-gang-graffiti",
    summary: "Builders' gang names that include Khufu's name are painted inside the relieving chambers above the King's Chamber. Lehner and Hawass read them as the marks of the crews who built it.",
    kind: "text",
    factId: "giza-fact-gang-graffiti",
    source: NOVA_BUILDERS_1997,
  },
  {
    id: "giza-evidence-workers-town",
    summary: "A Fourth Dynasty town with bakeries and galleries stands beside the pyramids. Its excavators read it as the base of the workforce and its managers.",
    kind: "excavation",
    factId: "giza-fact-workers-town",
    source: AERA_LOST_CITY,
  },
  {
    id: "giza-evidence-workers-cemetery",
    summary: "A cemetery of workers lies beside the town. Hawass and Lehner read the town and the burials as those of a fed and organised labour force, and not of slaves.",
    kind: "excavation",
    factId: "giza-fact-workers-cemetery",
    source: NOVA_BUILDERS_1997,
  },
  {
    id: "giza-evidence-radiocarbon-in-old-kingdom",
    summary: "Radiocarbon dates on organic matter in the mortar place the pyramids in the third millennium BC. They differ from the historical dates of the kings by centuries, not by thousands of years.",
    kind: "measurement",
    factId: "giza-fact-radiocarbon-dates",
    source: KOCH_PROJECT_1999,
  },
  {
    id: "giza-evidence-radiocarbon-offset",
    summary: "The same dates run from 100 to nearly 400 years older than the historical chronology. The project suggests the builders burned old wood; the gap is not fully explained.",
    kind: "measurement",
    factId: "giza-fact-radiocarbon-dates",
    source: KOCH_PROJECT_1999,
  },
  {
    id: "giza-evidence-coffer-is-a-sarcophagus",
    summary: "Petrie describes the granite box in the King's Chamber as of the usual form of the earliest Egyptian sarcophagi, with fittings for a lid.",
    kind: "argument",
    madeBy: "Flinders Petrie",
    factId: "giza-fact-granite-coffer",
    source: PETRIE_INSIDE,
  },
  {
    id: "giza-evidence-hatnub-ramp",
    summary:
      "A quarry ramp of Khufu's time shows that steep ramps with posts and stairs were in use for hauling stone on sledges. Its excavators say it may throw light on pyramid building; they do not say it was used at Giza, and the stone there was alabaster.",
    kind: "excavation",
    factId: "giza-fact-hatnub-ramp",
    source: LIVERPOOL_2018,
  },
  {
    id: "giza-evidence-nova-block-trials",
    summary:
      "In NOVA's trial at Giza twelve men pulled a block of 1.5 tons over a slick track with ease, and twelve quarrymen cut 186 blocks in 21 days. Lehner notes the limits: iron tools and a winch were used, and trucks brought the stone.",
    kind: "experiment",
    source: NOVA_BUILDERS_1997,
  },
  {
    id: "giza-evidence-wet-sand-sledge",
    summary:
      "In the laboratory a sledge on sand needs about half the pull when the sand is wetted by the right amount. The team links this to a tomb painting of a man pouring water before a sledge that carries a statue; the trial was not made with pyramid blocks.",
    kind: "experiment",
    source: FALL_2014,
  },
  {
    id: "giza-evidence-straight-ramp-too-large",
    summary: "Brier sets out the objection to one straight ramp: at a slope of about 8 percent it would run for about a mile and hold about as much material as the pyramid, and no remains of one have been found.",
    kind: "argument",
    madeBy: "Bob Brier, setting out Jean-Pierre Houdin's case",
    source: BRIER_2007,
  },
  {
    id: "giza-evidence-spiral-ramp-hides-corners",
    summary: "Against a ramp winding round the outside, Dieter Arnold is quoted: the pyramid would have been buried under its ramps while it was built, leaving the surveyors no corners or edges to sight along.",
    kind: "argument",
    madeBy: "Dieter Arnold, as quoted by Bob Brier",
    source: BRIER_2007,
  },
  {
    id: "giza-evidence-microgravity-image",
    summary: "A French microgravity survey of the 1980s produced an image of less dense zones that Houdin reads as the line of an internal ramp. The survey team had not interpreted it that way.",
    kind: "measurement",
    source: BRIER_2007,
  },
  {
    id: "giza-evidence-corner-notch",
    summary: "There is a notch about two thirds of the way up the north-east edge, where Houdin's model puts an open corner of the ramp. Brier calls it suggestive, not proof.",
    kind: "argument",
    madeBy: "Jean-Pierre Houdin, as reported by Bob Brier",
    source: BRIER_2007,
  },
  {
    id: "giza-evidence-internal-ramp-untested",
    summary: "When Brier wrote in 2007 no survey had been made to look for the ramp; permission for one had been applied for.",
    kind: "argument",
    madeBy: "Bob Brier",
    source: BRIER_2007,
  },
  {
    id: "giza-evidence-petrie-drill-pressure",
    summary:
      "From saw cuts and drill cores Petrie argued that granite was cut with bronze tools set with fixed cutting points harder than quartz, under a load of a ton or two on a drill, a pressure he called very surprising. No such saw or drill has been found.",
    kind: "argument",
    madeBy: "Flinders Petrie",
    source: PETRIE_METHODS,
  },
  {
    id: "giza-evidence-stocks-sand-sawing",
    summary: "Denys Stocks cut a groove in granite with a plain copper saw riding on sand laid in the cut: the sand does the cutting, not the metal.",
    kind: "experiment",
    source: NOVA_CUTTING_GRANITE,
  },
  {
    id: "giza-evidence-stocks-aswan-tests",
    summary: "Stocks ran sawing, drilling and cutting trials on Aswan granite as the Egyptians could have done them. He reports that such work was demanding for the craftsmen.",
    kind: "experiment",
    source: STOCKS_2001,
  },
  {
    id: "giza-evidence-obelisk-trials",
    summary: "NOVA's first trial at raising a granite obelisk with ramps, levers and ropes, in 1995, did not get the stone past about 40 degrees.",
    kind: "experiment",
    source: NOVA_OBELISK_1995,
  },
  {
    id: "giza-evidence-obelisk-raised-1999",
    summary: "On the third trial, in September 1999, a granite obelisk was stood upright in under two minutes with a sand pit and ropes, by a team led by Rick Brown.",
    kind: "experiment",
    source: NOVA_OBELISK_1999,
  },
  {
    id: "giza-evidence-belt-pattern",
    summary: "Bauval points out that the three large pyramids lie in a line with the third set off to one side, as the three stars of Orion's Belt do.",
    kind: "argument",
    madeBy: "Robert Bauval",
    source: BAUVAL_GILBERT_1994,
  },
  {
    id: "giza-evidence-sky-of-10500-bc",
    summary: "Hancock calls the three pyramids a map on the ground of the three stars of Orion's Belt. He and Bauval hold that the match is to the sky of about 10,500 BC, when they say Leo marked the spring equinox, and they date the Sphinx to that time.",
    kind: "argument",
    madeBy: "Robert Bauval and Graham Hancock",
    source: HANCOCK_1995,
  },
  {
    id: "giza-evidence-map-must-be-inverted",
    summary: "Krupp points out that the line of the pyramids bends toward the north while the Belt bends toward the south, so one of the two has to be turned upside down for them to match.",
    kind: "argument",
    madeBy: "E. C. Krupp",
    source: KRUPP_1997,
  },
  {
    id: "giza-evidence-belt-angle-mismatch",
    summary: "Fairall computed the sky for the proposed era and found the Belt lying at 47 to 50 degrees from north against about 38 degrees for the line of the pyramids, and the spring equinox in Virgo, not Leo.",
    kind: "argument",
    madeBy: "Anthony Fairall",
    source: FAIRALL_1999,
  },
];
