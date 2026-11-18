/**
 * Text for landmark cards at Karahan Tepe, and the open questions for a later "what it might have looked like" panel.
 * Facts stated in published text only; an interpretation is always attributed to whoever made it.
 * No positions: `layoutElementId` names an element in karahanTepeLayout.ts, or is null where no source opened says
 * where the piece stood. Source keys are the ones defined at the top of karahanTepeLayout.ts, plus:
 *
 * [AA23] = Anadolu Agency report of 1 October 2023, as carried by Daily Sabah, citing the Ministry of Culture and Tourism.
 * [GT23] = GoTürkiye press release, "Magnificent discoveries at Karahantepe and Göbeklitepe" (2023).
 * [TAN26] = The Art Newspaper, 28 August 2026, "Neolithic sculpture of human riding a leopard discovered in Turkey".
 * [AA26] = Anadolu Agency report of April 2026 on diet at Karahantepe, as carried by Daily Sabah (search summary only).
 */

export type KarahanTepeLandmark = {
  id: string;
  name: string;
  /** Null for a find whose building is not named in the sources opened. */
  structureId: "AA" | "AB" | "AC" | "AD" | null;
  /** An id from karahanTepeLayout.ts (structure, pillar group, bench or connection), or null. */
  layoutElementId: string | null;
  description: string;
  sourceCitation: string;
};

export type KarahanTepeOpenQuestion = {
  id: string;
  question: string;
  /** What published text says. */
  evidence: string;
  /** What is not known, or was not found in a source that could be opened. */
  caveat: string;
  sourceCitation: string;
};

const KARUL_2021 = "Karul 2021, Türk Arkeoloji ve Etnografya Dergisi 82, 21-31";
const TAS_TEPELER = "Taş Tepeler project, tastepeler.org (Karahantepe)";
const ARCHAEOLOGY_2024 = "Archaeology magazine, March/April 2024";

export const KARAHAN_TEPE_LANDMARKS: readonly KarahanTepeLandmark[] = [
  {
    id: "ab-carved-head",
    name: "The carved head",
    structureId: "AB",
    layoutElementId: "ab-west-ledge",
    description:
      "A human head carved from the living bedrock juts out from the middle of a ridge along the west wall, turned slightly toward the entrance stairs. " +
      "The excavator describes a man with a protruding forehead, thick lips and a beard, with two small niches beside him. " +
      "Karul has suggested the ridge behind it may be a serpent's body; that is an interpretation.",
    sourceCitation: `${KARUL_2021}; ${ARCHAEOLOGY_2024}`,
  },
  {
    id: "ab-bedrock-pillars",
    name: "The pillars left in the rock",
    structureId: "AB",
    layoutElementId: "ab-front-row",
    description:
      "The chamber was made by cutting the bedrock away and leaving ten pillars standing; an eleventh, a flat slab, was set in a shallow bed afterwards. " +
      "Four taller pillars (1.6 to 1.7 m) stand in front of the head, two on each side with the space before it left clear, and six shorter ones (1 to 1.4 m) stand behind. " +
      "The excavator describes them all as phallus-shaped.",
    sourceCitation: KARUL_2021,
  },
  {
    id: "ab-porthole-entrance",
    name: "The way in from Structure AD",
    structureId: "AB",
    layoutElementId: "ad-to-ab-porthole",
    description:
      "Structure AB is entered on its south side through a round opening 70 cm across, then down five steps. A second, rougher stair of four steps leaves at the north-east corner. " +
      "From the wear on the steps the excavator infers that people came in at the south and left at the north, passing the head on the way.",
    sourceCitation: KARUL_2021,
  },
  {
    id: "ab-serpentine-channel",
    name: "The serpentine channel",
    structureId: "AB",
    layoutElementId: "AB",
    description:
      "A winding channel cut into the rock surface opens into the chamber on its north side. " +
      "The project links it, and a small opening between AB and AD, to a ritual involving liquid; that is an interpretation, and no residue analysis was found in the sources read.",
    sourceCitation: `${KARUL_2021}; ${TAS_TEPELER}`,
  },
  {
    id: "ab-sealing-stones",
    name: "How the chamber was closed",
    structureId: "AB",
    layoutElementId: "AB",
    description:
      "When excavated the chamber was full: sterile reddish soil on the floor, 1.5 m of dark fill with stones above it, and a cap of large flat stones, one of them 2.65 by 1.65 m. " +
      "Stones had been set on top of the six shorter pillars to bring them up to the surface, and the fill stops at the edge of the building. " +
      "The excavator reads this as deliberate burial in stages, not erosion.",
    sourceCitation: KARUL_2021,
  },
  {
    id: "aa-snake-bench",
    name: "The snake and the fox",
    structureId: "AA",
    layoutElementId: "aa-west-bench",
    description:
      "A bench 6.6 m long runs along the west side of this shallow building. A snake is engraved along its front, and at the end of the snake, beneath two steps that lead outside, a fox with a small niche under its chin.",
    sourceCitation: KARUL_2021,
  },
  {
    id: "ad-rock-cut-wall",
    name: "The rock-cut wall and benches",
    structureId: "AD",
    layoutElementId: "ad-wall-bench",
    description:
      "The western half of the great building is cut straight into the hillside: the rock face that forms its wall stands 4.3 m high (the project website says 4.5 m). " +
      "Buttresses and a two-step bench are carved from the same rock, and the bench continues along the 1.5 m thick built wall that closes the other half. " +
      "Broken sculptures, stone plates and vessels were found left on the benches.",
    sourceCitation: `${KARUL_2021}; ${TAS_TEPELER}`,
  },
  {
    id: "ad-central-pillars",
    name: "The two central pillars",
    structureId: "AD",
    layoutElementId: "ad-central-pair",
    description:
      "Two pillars stood opposite each other at the centre of the building, seated in rather shallow beds in the rock floor. Both were found collapsed. " +
      "The model stands them upright; their height is an estimate, as none has been published in the sources read.",
    sourceCitation: KARUL_2021,
  },
  {
    id: "ac-stone-capping",
    name: "A building still sealed",
    structureId: "AC",
    layoutElementId: "AC",
    description:
      "About 20 m north-east of the main group, this round building 5.5 m across is edged by bedrock on the south and upright stones on the north. " +
      "It was found covered with large flat stones that stop at its edge, like Structure AB. In the 2021 report its interior had not yet been excavated.",
    sourceCitation: KARUL_2021,
  },
  {
    id: "seated-male-statue-2023",
    name: "The seated statue (found 2023)",
    structureId: null,
    layoutElementId: null,
    description:
      "In autumn 2023 the Ministry of Culture and Tourism announced a seated male statue found fixed to the ground on a bench, with emphasised ribs, spine and shoulder bones. " +
      "Its height is reported as 2.3 m by Anadolu Agency and 2.45 m by GoTürkiye. A vulture sculpture and stone plates were found at the same bench. " +
      "The reports read do not say which building it was in, so it is not placed in the model.",
    sourceCitation: "Anadolu Agency via Daily Sabah, 1 October 2023; GoTürkiye press release, 2023",
  },
  {
    id: "leopard-rider-statue-2026",
    name: "The figure on a leopard (found 2026)",
    structureId: null,
    layoutElementId: null,
    description:
      "In August 2026 the ministry announced a limestone statue 70 cm tall of a human seated on a leopard, found on a bench along the wall of a structure about three metres across with a floor of flat stones. " +
      "That is a different, smaller building from the four modelled here. An earlier composite statue from the site shows the reverse, a large cat on a person's shoulders.",
    sourceCitation: "The Art Newspaper, 28 August 2026",
  },
];

export const KARAHAN_TEPE_OPEN_QUESTIONS: readonly KarahanTepeOpenQuestion[] = [
  {
    id: "roofing",
    question: "Were these buildings roofed?",
    evidence:
      "For Structure AB the excavator notes a slightly carved bed running along the straight upper east edge and says it is 'probably related to the top cover'. " +
      "The central pillars of Structure AD sat in 'rather shallow' beds and were found collapsed. " +
      "For the comparable buildings at Göbekli Tepe the question is argued both ways in print (Schmidt's open enclosures; Banning 2011 and Kurapkat 2012 for roofs).",
    caveat:
      "No source opened describes a roof, beam sockets or roof collapse in Structure AD, and a 23 m span is a serious structural problem. " +
      "The shallow-socket argument for a roof at Karahan Tepe was found only on blogs. Draw any roof as a hypothesis.",
    sourceCitation: `${KARUL_2021} (which cites Banning 2011 and Kurapkat 2012)`,
  },
  {
    id: "deliberate-burial",
    question: "Were the buildings buried on purpose?",
    evidence:
      "Structures AA, AB and AC were each filled and then capped with large stones that stop at the building's edge; in AB stones were balanced on the short pillars. " +
      "Structure AD is different: the excavator says it was 'demolished in order to terminate its use', with fill sloping in from the edges and broken sculptures left on the benches. " +
      "Karul also notes that most human sculptures have damaged noses and suggests this was part of ending a building's life.",
    caveat:
      "Deliberate filling is the excavator's reading of the fill sequence, from a preliminary report written when AD was half excavated. " +
      "The fill of AA and AB contained a few pottery fragments, which the report mentions without explaining. Why the buildings were buried is not known.",
    sourceCitation: `${KARUL_2021}; ${ARCHAEOLOGY_2024}`,
  },
  {
    id: "palaeoenvironment",
    question: "What did the landscape look like?",
    evidence:
      "The site sits on stepped limestone hills in the Tek Tek Mountains, among shallow steep-sided valleys that both Çelik and Karul think suited trapping and hunting; stone-walled hunting enclosures are reported nearby. " +
      "In 2026 Karul told Anadolu Agency that animal bone and plant remains point to gazelle as the main meat and legumes as an important food.",
    caveat:
      "No published pollen, charcoal or other vegetation study for Karahan Tepe was found. The diet statement is a press report, not a publication. " +
      "Descriptions of open oak, almond and pistachio woodland were found only on an unsourced blog, so trees in any reconstruction are a guess.",
    sourceCitation: `${KARUL_2021}; Çelik 2011, Documenta Praehistorica 38; ${ARCHAEOLOGY_2024}; Anadolu Agency via Daily Sabah, April 2026`,
  },
];
