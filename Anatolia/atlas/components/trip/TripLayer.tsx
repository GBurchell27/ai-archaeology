"use client";

import { useMemo } from "react";
import { TripLighting } from "@/components/trip/TripLighting";
import { TripPresence } from "@/components/trip/TripPresence";
import { TripRouteLines, type PlannedRoute } from "@/components/trip/TripRouteLines";
import { useTripClockState } from "@/components/trip/useTripReplay";
import { boundsCenter } from "@/lib/geo";
import { atlasRouteSurface } from "@/lib/trip/atlasRouteSurface";
import type { TripReplay } from "@/lib/trip/tripReplay";
import { roadFor, type TripRoads } from "@/lib/trip/tripRoads";
import { buildTravelRoute } from "@/lib/trip/tripRoute";
import { locateSegment } from "@/lib/trip/tripTimeline";
import type { AtlasMetadata } from "@/lib/types";

/** The replayed journey drawn over the atlas terrain. Render inside the atlas canvas. */
export function TripLayer(props: {
  replay: TripReplay;
  roads: TripRoads | null;
  metadata: AtlasMetadata;
  metres: Float32Array;
  exaggeration: number;
  follow: boolean;
  onFollowInterrupt: () => void;
}) {
  const { replay, roads, metadata, metres, exaggeration } = props;
  const surface = useMemo(
    () => atlasRouteSurface(metadata, metres, boundsCenter(metadata.bounds), exaggeration),
    [metadata, metres, exaggeration],
  );
  const routes = useMemo(() => replay.timed.flatMap((timed): PlannedRoute[] => timed.segment.kind === "travel"
    ? [{
      timed,
      mode: timed.segment.mode,
      route: buildTravelRoute(timed.segment, surface, roadFor(roads, timed.segment)?.coordinates),
    }]
    : []), [replay, roads, surface]);
  const routeByIndex = useMemo(() => new Map(routes.map((planned) => [planned.timed.index, planned])), [routes]);
  const { timeMs } = useTripClockState(replay.clock);
  const location = locateSegment(replay.timed, timeMs);
  return (
    <group>
      <TripLighting />
      <TripRouteLines routes={routes} location={location} />
      <TripPresence
        location={location}
        routes={routeByIndex}
        surface={surface}
        follow={props.follow}
        onFollowInterrupt={props.onFollowInterrupt}
      />
    </group>
  );
}
