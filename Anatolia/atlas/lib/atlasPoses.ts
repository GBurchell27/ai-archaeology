import type { CameraPose } from "@/components/AtlasCamera";
import { boundsCenter, lonLatToMercator, sampleHeight, toLocal } from "@/lib/geo";
import { ATLAS_FOV_DEGREES } from "@/lib/pinCluster";
import { resolvePlaceRelief, type TerrainSourceId } from "@/lib/terrainSource";
import type { AtlasMetadata, SiteFeature } from "@/lib/types";

export function overviewPose(
  bounds: AtlasMetadata["bounds"],
  token: number,
  target: CameraPose["target"] = [0, 0, 0],
): CameraPose {
  const [left, bottom, right, top] = bounds;
  const aspect = Math.max(0.36, window.innerWidth / Math.max(1, window.innerHeight));
  const halfFov = Math.tan(ATLAS_FOV_DEGREES * Math.PI / 360);
  const distance = Math.max((right - left) * 0.55 / aspect, (top - bottom) * 0.62) / halfFov;
  const pitch = Math.PI * 0.36;
  return {
    position: [target[0], target[1] + Math.sin(pitch) * distance, target[2] + Math.cos(pitch) * distance],
    target,
    token,
  };
}

export function lookPose(
  longitude: number,
  latitude: number,
  metadata: AtlasMetadata,
  metres: Float32Array,
  exaggeration: number,
  token: number,
  distance = 70000,
): CameraPose {
  const origin = boundsCenter(metadata.bounds);
  const [east, north] = lonLatToMercator(longitude, latitude);
  const elevation = sampleHeight(metres, metadata.width, metadata.height, metadata.bounds, east, north);
  const [xCoord, zCoord] = toLocal(longitude, latitude, origin);
  const yCoord = (elevation - metadata.elevation.min) * exaggeration;
  return {
    position: [xCoord + distance * 0.16, yCoord + distance * 0.34, zCoord + distance * 0.58],
    target: [xCoord, yCoord + 24, zCoord - distance * 0.05],
    token,
  };
}

export function sitePose(
  site: SiteFeature,
  metadata: AtlasMetadata,
  metres: Float32Array,
  exaggeration: number,
  token: number,
  source: TerrainSourceId,
): CameraPose {
  const origin = boundsCenter(metadata.bounds);
  const [longitude, latitude] = site.geometry.coordinates;
  const [east, north] = lonLatToMercator(longitude, latitude);
  const elevation = sampleHeight(metres, metadata.width, metadata.height, metadata.bounds, east, north);
  const [xCoord, zCoord] = toLocal(longitude, latitude, origin);
  const yCoord = (elevation - metadata.elevation.min) * exaggeration;
  const raw = metadata.details[site.id];
  const detail = raw ? resolvePlaceRelief(raw, source) : undefined;
  const windowSpan = detail
    ? Math.max(detail.bounds[2] - detail.bounds[0], detail.bounds[3] - detail.bounds[1])
    : 0;
  const distance = detail ? Math.max(windowSpan * 0.82, 5500) : 15500;
  return {
    position: [xCoord + distance * 0.16, yCoord + distance * 0.34, zCoord + distance * 0.58],
    target: [xCoord, yCoord + 24, zCoord - distance * 0.05],
    token,
  };
}

/** Straight-line distance from the camera to the point it looks at. */
export function poseDistance(pose: CameraPose): number {
  return Math.hypot(
    pose.position[0] - pose.target[0],
    pose.position[1] - pose.target[1],
    pose.position[2] - pose.target[2],
  );
}
