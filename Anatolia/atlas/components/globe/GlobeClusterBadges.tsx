"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState, type MutableRefObject } from "react";
import { lonLatHeightToScene, sceneToLonLatHeight, type GlobeLook } from "@/lib/globe/ellipsoid";
import type { ScreenBox } from "@/lib/globe/labelLayout";
import type { SiteLayer } from "@/lib/globe/siteBlock";
import { countShownByBucket } from "@/lib/globe/siteGrid";
import { projectVisiblePins } from "@/lib/globe/visibleSites";
import { CLUSTER_CELL_PX, clusterByScreen, clusterSignature, type PinCluster, type ScreenPin } from "@/lib/pinCluster";
import styles from "./GlobeSites.module.css";

interface CountPin extends ScreenPin {
  count: number;
}

interface Badge {
  key: string;
  count: number;
  position: [number, number, number];
  longitude: number;
  latitude: number;
  screenX: number;
  screenY: number;
}

/** Below this the points read as separate places and badges would only cover them. */
const BADGE_ALTITUDE_FLOOR = 1_500_000;
const MIN_BADGE_COUNT = 60;
const MAX_BADGES = 7;
const BADGE_HALF_WIDTH_PX = 26;
const BADGE_HALF_HEIGHT_PX = 14;
const MAX_BUCKETS_PROJECTED = 6000;
const RECLUSTER_MS = 100;
const APPROACH_FACTOR = 0.36;
const CLOSEST_APPROACH = 350_000;

/** Square-degree counts of the shown sites, as pins the screen clusterer can take. */
function bucketPins(layers: readonly SiteLayer[]): CountPin[] {
  return layers.flatMap(({ block, shown }, layer) =>
    countShownByBucket(block.grid, block.columns.lon, block.columns.lat, shown).map((bucket, index): CountPin => {
      const [x, y, z] = lonLatHeightToScene(bucket.longitude, bucket.latitude, 0);
      return {
        id: `${layer}:${index}`, name: "", x, y, z, longitude: bucket.longitude, latitude: bucket.latitude,
        screenX: 0, screenY: 0, visible: false, count: bucket.count,
      };
    }));
}

/** A cluster of buckets as one badge at the count-weighted centre, pulled back onto the surface. */
function badgeFor(cluster: PinCluster, pinsById: Map<string, CountPin>): Badge {
  let count = 0;
  const centre = [0, 0, 0];
  for (const id of cluster.ids) {
    const pin = pinsById.get(id)!;
    count += pin.count;
    centre[0] += pin.x * pin.count;
    centre[1] += pin.y * pin.count;
    centre[2] += pin.z * pin.count;
  }
  const place = sceneToLonLatHeight([centre[0] / count, centre[1] / count, centre[2] / count]);
  return {
    key: cluster.key, count, longitude: place.longitude, latitude: place.latitude,
    screenX: cluster.screenX, screenY: cluster.screenY,
    position: lonLatHeightToScene(place.longitude, place.latitude, 0),
  };
}

function formatCount(count: number): string {
  return count < 1000 ? String(count) : `${(count / 1000).toFixed(count < 10_000 ? 1 : 0)}k`;
}

/** Count badges over the densest parts of the point field, from high altitude only. */
export function GlobeClusterBadges(props: {
  layers: readonly SiteLayer[];
  onClusterPick?: (target: GlobeLook) => void;
  /** Kept up to date with the screen boxes of the badges, so name labels can keep clear of them. */
  occupied: MutableRefObject<ScreenBox[]>;
}) {
  const { layers, onClusterPick, occupied } = props;
  // One pass over the points per filter change; the frame loop below only sees the buckets.
  const pins = useMemo(() => bucketPins(layers), [layers]);
  const pinsById = useMemo(() => new Map(pins.map((pin) => [pin.id, pin])), [pins]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const recluster = useRef({ due: 0, signature: "", pins, altitude: 0 });

  useFrame(({ camera, size }) => {
    const now = performance.now();
    if (now < recluster.current.due && recluster.current.pins === pins) return;
    recluster.current.due = now + RECLUSTER_MS;
    recluster.current.pins = pins;
    const altitude = sceneToLonLatHeight(camera.position.toArray()).height;
    recluster.current.altitude = altitude;
    const visible = altitude < BADGE_ALTITUDE_FLOOR ? [] : projectVisiblePins(pins, camera, size, MAX_BUCKETS_PROJECTED);
    const next = clusterByScreen(visible, CLUSTER_CELL_PX)
      .map((cluster) => ({ cluster, badge: badgeFor(cluster, pinsById) }))
      .filter(({ badge }) => badge.count >= MIN_BADGE_COUNT)
      .sort((left, right) => right.badge.count - left.badge.count)
      .slice(0, MAX_BADGES);
    occupied.current = next.map(({ badge }) => ({
      left: badge.screenX - BADGE_HALF_WIDTH_PX, right: badge.screenX + BADGE_HALF_WIDTH_PX,
      top: badge.screenY - BADGE_HALF_HEIGHT_PX, bottom: badge.screenY + BADGE_HALF_HEIGHT_PX,
    }));
    const signature = `${clusterSignature(next.map(({ cluster }) => cluster))}#${next.map(({ badge }) => badge.count).join(",")}`;
    if (signature === recluster.current.signature) return;
    recluster.current.signature = signature;
    setBadges(next.map(({ badge }) => badge));
  });

  return (
    <group>
      {badges.map((badge) => (
        <Html key={badge.key} position={badge.position} center zIndexRange={[5, 4]}>
          <button
            type="button"
            className={styles.badge}
            data-role="site-cluster"
            aria-label={`${badge.count.toLocaleString("en-GB")} sites here. Zoom in.`}
            onClick={() => onClusterPick?.({
              longitude: badge.longitude,
              latitude: badge.latitude,
              altitude: Math.max(CLOSEST_APPROACH, recluster.current.altitude * APPROACH_FACTOR),
            })}
          >
            {formatCount(badge.count)}
          </button>
        </Html>
      ))}
    </group>
  );
}
