import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readAtlasCamera } from "@/components/atlas/atlasCameraGlobals";
import type { CameraCommands } from "@/components/atlas/useCameraCommands";
import { lookPose } from "@/lib/atlasPoses";
import { WALK_DIVE_DISTANCE, advanceWalkEntry, walkHandoffStage, walkSiteUnderTarget, type WalkAnchor } from "@/lib/atlas/walkHandoff";
import { boundsCenter, toLocal } from "@/lib/geo";
import { lookPoseArgument } from "@/lib/pinCluster";
import type { AtlasMetadata, SiteFeature } from "@/lib/types";
import { findWalkSite } from "@/lib/walk/walkSites";

const POLL_MS = 200;

export interface WalkEntryInput {
  /** Present when the atlas sits under the coordinator: called to hand the view to the walk. */
  onEnterWalk: ((siteId: string) => void) | undefined;
  /** False while something else drives the camera close to the ground, such as the trip replay. */
  zoomEntry: boolean;
  sites: SiteFeature[];
  metadata: AtlasMetadata | null;
  metres: Float32Array | null;
  exaggeration: number;
  camera: CameraCommands;
}

export interface WalkEntry {
  /** The walkable site the camera is close over, to offer; null otherwise. */
  offeredSite: SiteFeature | null;
  /** The "walk this site" action for a site, or undefined when it has no walk. */
  walkAction: (siteId: string) => (() => void) | undefined;
}

/** The atlas side of the walk handoff: the offer, the zoom that goes through it, and the dive on the way out. */
export function useWalkEntry(input: WalkEntryInput): WalkEntry {
  const { onEnterWalk, zoomEntry, sites, metadata } = input;
  const latest = useRef(input);
  latest.current = input;
  const entered = useRef(false);
  const [offeredId, setOfferedId] = useState<string | null>(null);
  const walkable = useMemo(() => sites.filter((site) => findWalkSite(site.id)), [sites]);
  const bounds = metadata?.bounds ?? null;
  const anchors = useMemo<WalkAnchor[]>(() => {
    if (!bounds) return [];
    const origin = boundsCenter(bounds);
    return walkable.map((site) => {
      const [x, z] = toLocal(site.geometry.coordinates[0], site.geometry.coordinates[1], origin);
      return { id: site.id, x, z };
    });
  }, [walkable, bounds]);

  const enter = useCallback((site: SiteFeature) => {
    if (entered.current) return;
    entered.current = true;
    diveToward(site, latest.current);
    latest.current.onEnterWalk?.(site.id);
  }, []);

  const enabled = Boolean(onEnterWalk) && zoomEntry && anchors.length > 0;
  useEffect(() => {
    if (!enabled) {
      setOfferedId(null);
      return undefined;
    }
    return watchWalkZoom(anchors, setOfferedId, (siteId) => {
      const site = walkable.find((item) => item.id === siteId);
      if (site) enter(site);
    });
  }, [enabled, anchors, walkable, enter]);

  // The dive is cut short when the atlas unmounts; no later view should think a flight is still running.
  useEffect(() => () => {
    if (entered.current) document.body.dataset.flying = "false";
  }, []);

  return {
    offeredSite: walkable.find((site) => site.id === offeredId) ?? null,
    walkAction: (siteId) => {
      const site = onEnterWalk ? walkable.find((item) => item.id === siteId) : undefined;
      return site ? () => enter(site) : undefined;
    },
  };
}

/** Polls the camera: reports the site to offer, and the site a zoom has just gone through. Returns its stop. */
function watchWalkZoom(anchors: WalkAnchor[], onOffer: (siteId: string | null) => void, onEnter: (siteId: string) => void): () => void {
  let crossedFromAbove = false;
  const timer = window.setInterval(() => {
    const camera = readAtlasCamera();
    // A flight passing low over a site is not the user zooming in on it.
    if (!camera || document.body.dataset.flying === "true") return;
    const anchor = walkSiteUnderTarget(camera.target, anchors);
    const stage = walkHandoffStage(camera.distance, anchor !== null);
    onOffer(stage === "none" ? null : anchor?.id ?? null);
    const next = advanceWalkEntry(crossedFromAbove, stage);
    crossedFromAbove = next.crossedFromAbove;
    if (next.enter && anchor) onEnter(anchor.id);
  }, POLL_MS);
  return () => window.clearInterval(timer);
}

/** Pushes the camera at the site while the coordinator's crossfade runs, so entering reads as diving in. */
function diveToward(site: SiteFeature, { metadata, metres, exaggeration, camera }: WalkEntryInput): void {
  if (!metadata || !metres || !camera.pose) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const [longitude, latitude] = site.geometry.coordinates;
  camera.setPose(lookPose(longitude, latitude, metadata, metres, exaggeration, camera.pose.token + 1, lookPoseArgument(WALK_DIVE_DISTANCE)));
}
