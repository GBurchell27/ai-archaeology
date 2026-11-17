// When the Anatolia atlas gives way to the walk view of a site: the atlas camera
// zooms in on a walkable site, is offered the walk, and enters it by zooming on.

/** Below this camera distance, over a walkable site, the atlas offers the walk. Metres. */
export const OFFER_WALK_DISTANCE = 3000;
/** A zoom that crosses this camera distance enters the walk. The atlas camera stops at 240 m. */
export const ENTER_WALK_DISTANCE = 700;
/** How far the point the camera looks at may sit from the site, on the ground, and still count as over it. */
export const WALK_SITE_REACH = 800;
/** Where the camera is sent while the atlas fades out under the walk view. */
export const WALK_DIVE_DISTANCE = 260;

export type WalkHandoffStage = "none" | "offer" | "enter";

export interface GroundPoint { x: number; z: number }
export interface WalkAnchor extends GroundPoint { id: string }

/** The walkable site under the point the camera looks at, or null when none is within reach. */
export function walkSiteUnderTarget(target: GroundPoint, anchors: readonly WalkAnchor[]): WalkAnchor | null {
  let nearest: WalkAnchor | null = null;
  let nearestOffset = WALK_SITE_REACH;
  for (const anchor of anchors) {
    const offset = Math.hypot(anchor.x - target.x, anchor.z - target.z);
    if (offset <= nearestOffset) {
      nearest = anchor;
      nearestOffset = offset;
    }
  }
  return nearest;
}

/** "offer" shows the affordance; "enter" means the user kept zooming and the walk takes over. */
export function walkHandoffStage(cameraDistance: number, overWalkSite: boolean): WalkHandoffStage {
  if (!overWalkSite || cameraDistance >= OFFER_WALK_DISTANCE) return "none";
  return cameraDistance < ENTER_WALK_DISTANCE ? "enter" : "offer";
}

/** Only a zoom that crosses the line enters: a camera that starts below it must first be seen above it. */
export function advanceWalkEntry(crossedFromAbove: boolean, stage: WalkHandoffStage): { crossedFromAbove: boolean; enter: boolean } {
  if (stage !== "enter") return { crossedFromAbove: true, enter: false };
  return { crossedFromAbove: false, enter: crossedFromAbove };
}
