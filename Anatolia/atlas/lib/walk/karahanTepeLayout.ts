/**
 * Schematic layout of Structures AA, AB, AC and AD at Karahan Tepe, in local metres from an arbitrary origin at the
 * centre of Structure AD. A diagram from figures stated in published text, not a survey. No real-world coordinates
 * belong in this file. Nothing here was measured from a plan or a photograph.
 *
 * [K21] = Karul 2021, "Buried Buildings at Pre-Pottery Neolithic Karahantepe", Türk Arkeoloji ve Etnografya Dergisi
 *         82, 21-31. The excavator's preliminary report after the 2019 and 2020 seasons. AD was then about half dug.
 * [TT]  = Taş Tepeler project page for Karahantepe, tastepeler.org/en/settlements/karahantepe (read 2026-11).
 * [C11] = Çelik 2011, "Karahan Tepe: a new cultural centre in the Urfa area in Turkey", Documenta Praehistorica 38,
 *         241-253, doi:10.4312/dp.38.19. Surface survey before excavation.
 * [AM24] = "Discovering a New Neolithic World", Archaeology magazine, March/April 2024. Journalism quoting Karul.
 * [EST] = estimated for this model. Not a published figure.
 *
 * Where sources disagree, both figures are in the comment and the excavator's paper [K21] is the one drawn.
 * Not found in any source opened: pillar heights in AD, AD's entrance, AB's east-west offset from AD, which side of
 * AB Structure AA lies on, AC's depth. Those are all [EST] and a modeller should check them against site photographs.
 */

/** Local plan position. East and north are positive. The origin is the centre of Structure AD. */
export type PlanPosition = { eastM: number; northM: number };

export type FootprintShape = "rounded-rectangle" | "rounded-trapezoid" | "circle";

export type PillarKind = "t-pillar" | "phallic-bedrock-pillar" | "free-standing-slab";

export type PillarGroup = {
  id: string;
  kind: PillarKind;
  count: number;
  heightM: number;
  /** Width of a T-pillar's broad face, or the diameter of a phallic pillar. */
  widthM: number;
  /** T-pillars only: the narrow dimension. */
  thicknessM?: number;
  /** False for the two central pillars of AD, which were found collapsed. */
  foundStanding: boolean;
  placement: string;
};

export type Bench = {
  id: string;
  /** Number of steps in the bench profile: AD's benches have two. */
  tiers: number;
  /** Null where the bench follows the wall and no length is published. */
  lengthM: number | null;
  heightM: number;
  depthM: number;
  placement: string;
};

export type Footprint = {
  shape: FootprintShape;
  eastWestM: number;
  northSouthM: number;
  /** Floor below the surrounding bedrock surface at the deepest published side. Null where nothing is published. */
  depthBelowBedrockM: number | null;
};

export type Structure = {
  id: "AA" | "AB" | "AC" | "AD";
  name: string;
  centre: PlanPosition;
  footprint: Footprint;
  pillarGroups: readonly PillarGroup[];
  benches: readonly Bench[];
  /** Published features with no dimensions, for the modeller to place by eye. */
  undimensionedFeatures: readonly string[];
};

export type Connection = {
  id: string;
  kind: "porthole-and-stairs" | "stairs" | "unspecified";
  from: Structure["id"] | "outside";
  to: Structure["id"] | "outside";
  /** Diameter of a porthole. Null for stairs. */
  openingDiameterM: number | null;
  stepCount: number | null;
  placement: string;
};

export type WalkerStart = { position: PlanPosition; facingBearingDeg: number; standingIn: Structure["id"] };

// ---------------------------------------------------------------------------------------------------------------
// Structure AD: the large central building
// ---------------------------------------------------------------------------------------------------------------

/** [K21] "the diameter of the structure reaches 23 meters". [TT] "an internal diameter of 23 meters". */
const AD_DIAMETER_M = 23;
/**
 * [K21] the western half is cut into bedrock and that rock face, which forms the wall, is 4.3 m high.
 * [TT] gives 4.5 m for the same cut. The eastern half is partly bedrock, partly a free-standing stone wall [K21].
 */
const AD_WEST_ROCK_FACE_HEIGHT_M = 4.3;
/** [K21] the built wall on the other half is 1.5 m thick. [TT] it has at least three phases, one inside another. */
export const AD_BUILT_WALL_THICKNESS_M = 1.5;
/** [EST] no height is published for the built (eastern) wall. Drawn lower than the rock face, as the slope falls east. */
export const AD_BUILT_WALL_HEIGHT_M = 2.5;

const AD_PILLAR_GROUPS: readonly PillarGroup[] = [
  {
    id: "ad-wall-pillars",
    kind: "t-pillar",
    // [TT] "the wall of the building is divided by 16 pillars". [K21] gives no count (the building was half dug);
    // it says the western ones are buttresses carved from the bedrock, the rest stand along the built wall.
    count: 16,
    // [EST] no AD pillar height was found in any source opened. Must stay under the 4.3 m rock face [K21].
    // [C11] pillars exposed elsewhere on the site are 1 to 2 m high, 0.5 to 0.9 m wide and 0.2 to 0.25 m thick,
    // and an unfinished pillar in the quarry is about 4.5 m; neither is a measurement of AD.
    heightM: 3,
    widthM: 0.8, // [EST] within the [C11] surface range.
    thicknessM: 0.25, // [EST] top of the [C11] surface range.
    foundStanding: true,
    placement: "Around the wall, with the two-step benches between them [TT]. [EST] drawn evenly spaced; spacing is not published.",
  },
  {
    id: "ad-central-pair",
    kind: "t-pillar",
    // [K21] "two more collapsed pillars inside the building ... seated on a rather shallow bed opposite each other
    // in the center". [TT] "two more pillars stand facing each other in the center".
    count: 2,
    heightM: 4, // [EST] taller than the wall pillars by analogy with Göbekli Tepe. Not published.
    widthM: 1.1, // [EST]
    thicknessM: 0.35, // [EST]
    foundStanding: false,
    placement: "Centre of AD, opposite each other in shallow beds [K21]. [EST] 3 m apart; their axis is not published.",
  },
];

const AD_BENCHES: readonly Bench[] = [
  {
    id: "ad-wall-bench",
    tiers: 2, // [K21] "benches with two steps" on the rock-cut side, continuing along the built wall. [TT] agrees.
    lengthM: null,
    heightM: 0.9, // [EST] both tiers together. No bench size is published.
    depthM: 1.2, // [EST] both tiers together.
    placement: "Along the whole wall, between the pillars [K21] [TT].",
  },
];

const STRUCTURE_AD: Structure = {
  id: "AD",
  name: "Structure AD",
  centre: { eastM: 0, northM: 0 },
  footprint: {
    // [K21] "a nearly rectangular plan with rounded corners"; [AM24] and most summaries call it oval or round.
    // [EST] drawn equal in both directions because only one "diameter" is published.
    shape: "rounded-rectangle",
    eastWestM: AD_DIAMETER_M,
    northSouthM: AD_DIAMETER_M,
    depthBelowBedrockM: AD_WEST_ROCK_FACE_HEIGHT_M,
  },
  pillarGroups: AD_PILLAR_GROUPS,
  benches: AD_BENCHES,
  undimensionedFeatures: [
    "[K21] [TT] the floor is the bedrock itself, levelled.",
    "[TT] deep pits dug into the floor in two places, and further pits cut in front of the benches and then covered.",
    "[K21] broken sculptures, stone plates and vessels were found left on the benches.",
    "[AM24] two opposing areas on the north and south sides where objects were deliberately left.",
    "[EST] no entrance to AD is described in any source opened. None is drawn; the modeller must choose.",
  ],
};

// ---------------------------------------------------------------------------------------------------------------
// Structure AB: the chamber of bedrock pillars
// ---------------------------------------------------------------------------------------------------------------

/**
 * [K21] "This 7 x 6 meters structure essentially has a trapezoidal plan with rounded corners", "ovoid", "carved
 * entirely into the bedrock". [TT] "7x6 meters". [AM24] "the oval space covers 450 square feet" (about 42 m²).
 * The carved head is on the west wall [K21], which [TT] calls the long wall, so the 7 m side runs north-south.
 */
const AB_NORTH_SOUTH_M = 7;
const AB_EAST_WEST_M = 6;
/**
 * [TT] "3.5 meters deep". [K21] gives no depth; its fill sequence (0.4 to 0.5 m of sterile soil, then 1.5 m of dark
 * fill, then capping stones) and front pillars of 1.6 to 1.7 m that "reach just below the surface" suggest the floor
 * near the pillars is nearer 2 to 2.5 m down. A figure of about 2.3 m circulates but was not found in a source
 * opened for this file. The published 3.5 m is recorded; the modeller may prefer the shallower reading.
 */
const AB_DEPTH_M = 3.5;

const AB_PILLAR_GROUPS: readonly PillarGroup[] = [
  {
    id: "ab-front-row",
    kind: "phallic-bedrock-pillar",
    count: 4, // [K21] "the four pillars in front of the human head on the west wall form the first row".
    heightM: 1.65, // [K21] 1.6 to 1.7 m. [AM24] says all ten are "about six feet" (1.8 m).
    widthM: 0.45, // [EST] diameter. Only the back row's 0.3 to 0.5 m is published.
    foundStanding: true,
    // [EST] the distance from the wall is not published.
    placement: "A north-south row in front of the head: two to its right, two to its left, the space straight in front of the head left empty [K21]. [EST] 1.5 m from the west wall.",
  },
  {
    id: "ab-back-row",
    kind: "phallic-bedrock-pillar",
    count: 6, // [K21] "the six pillars in the back row".
    heightM: 1.2, // [K21] 1 to 1.4 m.
    widthM: 0.4, // [K21] 30 to 50 cm in diameter.
    foundStanding: true,
    placement: "Behind the front row, farther from the head [K21]. [EST] 3.5 m from the west wall; drawn as one row, which is not confirmed.",
  },
  {
    id: "ab-eleventh-pillar",
    kind: "free-standing-slab",
    // [K21] "the number of pillars in the building reached 11 with a flat plate placed in a shallow bed". This is the
    // only pillar in AB not cut from the bedrock. [TT] and [AM24] count 10, leaving it out.
    count: 1,
    heightM: 1.4, // [EST] not published.
    widthM: 0.5, // [EST] not published.
    thicknessM: 0.15, // [EST] "flat plate" [K21].
    foundStanding: true,
    placement: "[EST] position not stated in [K21]. Place by eye from photographs.",
  },
];

const AB_BENCHES: readonly Bench[] = [
  {
    id: "ab-west-ledge",
    tiers: 1,
    lengthM: null,
    heightM: 1, // [EST] not published.
    depthM: 0.4, // [EST] not published.
    // [K21] "a ridge along the upper western side", its centre shaped into the head; "two small niches on the bench near the head".
    placement: "Along the west wall, carrying the carved head at its centre [K21].",
  },
];

const STRUCTURE_AB: Structure = {
  id: "AB",
  name: "Structure AB",
  // [K21] "adjacent to the north of Str. AD". [EST] the rock left between the two (1 m) and the 3 m westward offset:
  // AB is wholly rock-cut and only AD's western half is, so AB is drawn toward the west. Not a published position.
  centre: { eastM: -3, northM: AD_DIAMETER_M / 2 + 1 + AB_NORTH_SOUTH_M / 2 },
  footprint: { shape: "rounded-trapezoid", eastWestM: AB_EAST_WEST_M, northSouthM: AB_NORTH_SOUTH_M, depthBelowBedrockM: AB_DEPTH_M },
  pillarGroups: AB_PILLAR_GROUPS,
  benches: AB_BENCHES,
  undimensionedFeatures: [
    "[K21] a human head carved from the bedrock at the centre of the west wall, turned slightly toward the entrance stairs (south).",
    "[K21] the upper east side forms a straight line with a slightly carved bed along it, 'probably related to the top cover'.",
    "[K21] 'a serpentine channel opening into the building to the north'. [TT] it 'runs obliquely into the structure'.",
    "[TT] a small opening where AB meets AD, which the project links to pouring liquid (an interpretation).",
    "[K21] the floor surface is irregular.",
  ],
};

// ---------------------------------------------------------------------------------------------------------------
// Structure AA: the shallow building with the snake bench
// ---------------------------------------------------------------------------------------------------------------

/** [K21] "measures 8.5 x 7 meters and is nearly trapezoidal with rounded edges". [EST] which side runs north-south. */
const AA_NORTH_SOUTH_M = 8.5;
const AA_EAST_WEST_M = 7;

const STRUCTURE_AA: Structure = {
  id: "AA",
  name: "Structure AA",
  // [K21] AA is "adjacent" to AB and there is "a connection from Str. AB to Str. AA"; AA, AB and AD are "three adjacent
  // structures". [EST] the direction: no source opened says which side of AB it lies on. Drawn to the west with 1 m
  // of rock between, on the reasoning used for AB. LOW CONFIDENCE: check against a published plan before modelling.
  centre: { eastM: STRUCTURE_AB.centre.eastM - AB_EAST_WEST_M / 2 - 1 - AA_EAST_WEST_M / 2, northM: STRUCTURE_AB.centre.northM },
  footprint: {
    shape: "rounded-trapezoid",
    eastWestM: AA_EAST_WEST_M,
    northSouthM: AA_NORTH_SOUTH_M,
    depthBelowBedrockM: 1.1, // [K21] "shallow compared to the others and has a depth of ca. 1.1 meter".
  },
  pillarGroups: [], // [K21] describes no pillars in AA.
  benches: [
    {
      id: "aa-west-bench",
      tiers: 1,
      lengthM: 6.6, // [K21] "a 6.6 meters-long bench that extends along the west side".
      heightM: 0.5, // [EST] not published; the fill reached "the upper level of the bench" [K21].
      depthM: 0.6, // [EST] not published.
      placement: "Along the west side. A snake is engraved on its front, with a fox beneath the stairs at the end of the snake and a small niche under the fox's chin [K21].",
    },
  ],
  undimensionedFeatures: [
    "[K21] two adjacent small pits in the platform in front of the stairs, each 20 cm wide and 10 cm deep.",
    "[K21] a deep pit with amorphous edges in the northern half, filled with large stones, 'thought to be the result of destruction or an incomplete activity'.",
  ],
};

// ---------------------------------------------------------------------------------------------------------------
// Structure AC: the small outlying building
// ---------------------------------------------------------------------------------------------------------------

/** [K21] "about 20 meters northeast of this building complex". [EST] read as 20 m beyond AD's wall on a 45° bearing. */
const AC_DISTANCE_FROM_AD_CENTRE_M = AD_DIAMETER_M / 2 + 20 + 2.75;
const AC_OFFSET_M = Math.round(AC_DISTANCE_FROM_AD_CENTRE_M * Math.SQRT1_2);

const STRUCTURE_AC: Structure = {
  id: "AC",
  name: "Structure AC",
  centre: { eastM: AC_OFFSET_M, northM: AC_OFFSET_M },
  footprint: {
    shape: "circle",
    eastWestM: 5.5, // [K21] "with a diameter of 5.5 meters".
    northSouthM: 5.5,
    // [K21] in 2020 only the stone capping had been removed; the interior was not yet dug. No depth published.
    depthBelowBedrockM: null,
  },
  pillarGroups: [], // Interior unexcavated in [K21]; nothing is published in the sources opened.
  benches: [],
  undimensionedFeatures: [
    "[K21] the southern half is bordered by bedrock, the northern half by stones set vertically.",
    "[K21] the top was covered with large flat stones that do not spread beyond the building.",
    "[K21] it stands where the bedrock 'descends sharply again'.",
  ],
};

// ---------------------------------------------------------------------------------------------------------------
// Connections and the walker
// ---------------------------------------------------------------------------------------------------------------

export const KARAHAN_TEPE_CONNECTIONS: readonly Connection[] = [
  {
    id: "ad-to-ab-porthole",
    kind: "porthole-and-stairs",
    from: "AD",
    to: "AB",
    openingDiameterM: 0.7, // [K21] "entered through a circle with a diameter of 70 cm on the south side".
    stepCount: 5, // [K21] "descending from 5-step stairs".
    // [K21] the south steps can be reached "from both the adjacent Str. AD and the ground level"; "the main entry is via Str. AD".
    placement: "South side of AB. Worn steps suggest this was the way in [K21] (an inference by the excavator).",
  },
  {
    id: "ab-exit-stairs",
    kind: "stairs",
    from: "AB",
    to: "outside",
    openingDiameterM: null,
    stepCount: 4, // [K21] "another stair with four steps ... at the northeast corner"; "do not constitute a defined staircase".
    placement: "North-east corner of AB, taken to be the exit [K21] [TT].",
  },
  {
    id: "ab-to-aa",
    kind: "unspecified",
    from: "AB",
    to: "AA",
    openingDiameterM: null,
    stepCount: null,
    placement: "[K21] says only that 'there is also a connection from Str AB to Str. AA'. Its form and place are not described.",
  },
  {
    id: "aa-outside-steps",
    kind: "stairs",
    from: "AA",
    to: "outside",
    openingDiameterM: null,
    stepCount: 2, // [K21] "two steps at one end of this bench link the building to the outside".
    placement: "At one end of AA's west bench [K21]. Which end is not stated.",
  },
];

export const KARAHAN_TEPE_STRUCTURES: readonly Structure[] = [STRUCTURE_AD, STRUCTURE_AB, STRUCTURE_AA, STRUCTURE_AC];

/** [EST] in the southern part of AD's floor, looking north across the central pair toward the porthole into AB. */
export const KARAHAN_TEPE_WALKER_START: WalkerStart = { position: { eastM: 0, northM: -7 }, facingBearingDeg: 0, standingIn: "AD" };

/** [EST] reaches the far side of Structure AC from the origin. */
export const KARAHAN_TEPE_WALK_RADIUS_M = 40;

// ---------------------------------------------------------------------------------------------------------------
// The fill the buildings were found under
// ---------------------------------------------------------------------------------------------------------------

/** [K21] AB's fill from the floor up: 0.4 to 0.5 m of sterile reddish soil, 1.5 m of dark fill with stones, then large flat stones. */
export const AB_FILL = { sterileSoilM: 0.45, darkFillM: 1.5 } as const;

// ---------------------------------------------------------------------------------------------------------------
// Decisions made by eye for the walk model. Every one is [EST]: none is a published figure, and none was checked
// against a plan or a photograph. They are kept here, apart from the published figures, so they are easy to find.
// ---------------------------------------------------------------------------------------------------------------

export const KARAHAN_TEPE_DRAWING_ESTIMATES = {
  /**
   * [EST] AB's floor below the rock surface as drawn. [TT]'s 3.5 m is the only published depth, but [K21]'s own fill
   * sequence (0.45 m + 1.5 m + capping stones) and its 1.6 to 1.7 m pillars that "reach just below the surface" need
   * a floor about 2.3 m down. The excavator's paper is the one drawn, so 2.3 m is used and 3.5 m stays on record above.
   */
  abDrawnDepthM: 2.3,
  /** [EST] AD is drawn as a circle 23 m across ([K21] "nearly rectangular with rounded corners", [AM24] oval or round). */
  adDrawnAsCircle: true,
  /** [EST] AB and AA are drawn as rectangles with rounded corners of this radius. Which end of each trapezoid is the narrow one is not published, so no taper is drawn. */
  roomCornerRadiusM: 1,
  /** [EST] the head of a T-pillar in AD, as shares of its width and its height. No AD pillar is described in the sources. */
  tPillarHeadLengthPerWidth: 1.6,
  tPillarHeadHeightShare: 0.2,
  /** [EST] AD's central pair, centre to centre. They are drawn standing, side by side east and west; they were found collapsed [K21]. */
  adCentralPairSpacingM: 3,
  /**
   * [EST] the ground east of AD lies at AD's floor, so its built eastern wall stands free [K21] and the rock-cut western
   * half is the edge of a terrace. The edge runs from AD's north and south points through these points (metres from
   * AD's centre). [K21] says only that AD's west is cut into the rock and that the bedrock "descends sharply again"
   * near AC. The real hill is a slope, not one step.
   */
  terraceEdgeNorthOfAd: [{ eastM: 3.5, northM: 13.5 }, { eastM: 5, northM: 21 }, { eastM: 2, northM: 34 }],
  terraceEdgeSouthOfAd: [{ eastM: -6, northM: -40 }, { eastM: -1.5, northM: -16 }],
  /** [EST] AB's two rows of bedrock pillars: distance from the west wall, and places along it north (+) and south (-) of the head. */
  abFrontRowFromWestWallM: 1.5,
  abFrontRowAlongWallM: [-1.8, -0.9, 0.9, 1.8],
  abBackRowFromWestWallM: 3.5,
  abBackRowSpacingM: 0.9,
  /** [EST] the eleventh pillar, the flat slab. LOW CONFIDENCE: [K21] does not say where it stands. */
  abSlabFromWestWallM: 4.9,
  abSlabNorthOfCentreM: -2.2,
  /**
   * [EST] the carved head as a plain rounded form with no face: its three diameters. No size is published. It juts out
   * of the upper front of the ledge, because [K21] has the centre of the ridge "shaped into" the head.
   */
  abHeadBossM: { deepM: 0.5, highM: 0.6, wideM: 0.45 },
  /** [EST] how far the head is turned toward the entrance stairs in the south. [K21] says only "slightly". */
  abHeadTurnDeg: 15,
  /**
   * [EST] the neck of rock the head grows from: how far it reaches past the head's middle, and its height and width
   * where it leaves the wall. It is drawn in to three fifths of that behind the head. Not described in a source: [K21]
   * says only that the centre of the ridge is shaped into the head.
   */
  abHeadNeckM: { pastHeadMiddleM: 0.1, highM: 0.56, wideM: 0.62 },
  /**
   * [EST] the porthole is drawn in AB's south wall, in line with AB's centre, with the five steps inside AB below it.
   * [K21] gives the 0.7 m circle and the five steps but not clearly which comes first, nor any step size.
   * An artefact follows and is not a published fact: five 0.25 m steps above a floor drawn 2.3 m down put the sill
   * 1.05 m below the rock surface, and AD's floor is 4.3 m below it, so on AD's side the hole opens about 3.3 m up
   * the wall (3.6 m to its middle). No source opened says how high the opening is above either floor. With [TT]'s
   * 3.5 m depth for AB it would still be about 2 m up. [K21] has the steps reached "from both the adjacent Str. AD
   * and the ground level", which does not settle it.
   */
  portholeStepRiseM: 0.25,
  portholeStepTreadM: 0.3,
  stepWidthM: 0.9,
  /** [EST] the four rough exit steps climb the east wall into the north-east corner. Tread only: the rise is a fifth of the depth. */
  exitStepTreadM: 0.4,
  /** [EST] the serpentine channel on the rock surface north of AB: length, sideways swing and width. None is published. */
  channel: { lengthM: 5, swingM: 0.5, widthM: 0.22 },
  /** [EST] AA's two steps to the outside stand at the south end of its bench. [K21] says "one end". */
  aaStepsAtSouthEnd: true,
  /** [EST] AC as found: a kerb this high round a cap of flat stones. Its interior is not excavated in [K21], so none is drawn. */
  acKerbHeightM: 0.5,
  /** [EST] a capping stone. [K21] gives one stone only, 2.65 by 1.65 m, over AB. */
  cappingSlab: { lengthM: 1.9, widthM: 1.3, thicknessM: 0.3 },
} as const;

export const KARAHAN_TEPE_MODEL_NOTE =
  "A schematic of Structures AA to AD drawn from dimensions stated in published text, not a survey. The sizes of AB, AA and " +
  "AC and the 23 m span of AD are published. The positions of the buildings relative to one another, every pillar height in " +
  "AD, all bench sizes, the 2.3 m depth drawn for AB and the single rock step beside AD are estimates. AD is drawn as a " +
  "circle with no entrance, since none is published, and its two central pillars, found collapsed, are drawn standing. " +
  "The carved head is a plain rounded form with no face, and no engraving is drawn. The porthole opens high in AD's wall only " +
  "because of the depths drawn for the two floors: its height above either floor is not published.";

export const KARAHAN_TEPE_SOURCES: readonly { key: string; label: string; url: string }[] = [
  { key: "K21", label: "Karul 2021, Türk Arkeoloji ve Etnografya Dergisi 82", url: "https://dergipark.org.tr/en/pub/arkeolojiveetnografya/issue/63476/909296" },
  { key: "TT", label: "Taş Tepeler project, Karahantepe", url: "https://tastepeler.org/en/settlements/karahantepe" },
  { key: "C11", label: "Çelik 2011, Documenta Praehistorica 38", url: "https://doi.org/10.4312/dp.38.19" },
  { key: "AM24", label: "Archaeology magazine, March/April 2024", url: "https://archaeology.org/issues/march-april-2024/features/discovering-a-new-neolithic-world/" },
];
