"use client";

import { Line } from "@react-three/drei";
import { memo, useMemo } from "react";
import { travelledPoints, type TravelRoute } from "@/lib/trip/tripRoute";
import { MODE_COLORS } from "@/lib/trip/tripStyle";
import type { TripLocation } from "@/lib/trip/tripTimeline";
import type { TimedSegment, TravelMode } from "@/lib/trip/tripTypes";

export interface PlannedRoute {
  timed: TimedSegment;
  mode: TravelMode;
  route: TravelRoute;
}

/** Every leg as a faint line, with the part already travelled drawn solid over it. */
export function TripRouteLines(props: { routes: PlannedRoute[]; location: TripLocation }) {
  const current = props.location.timed.index;
  return (
    <group>
      {props.routes.map((planned) => {
        const fraction = planned.timed.index < current ? 1 : planned.timed.index === current ? props.location.progress : 0;
        return <RouteLine key={planned.timed.index} route={planned.route} color={MODE_COLORS[planned.mode]} fraction={fraction} />;
      })}
    </group>
  );
}

const RouteLine = memo(function RouteLine(props: { route: TravelRoute; color: string; fraction: number }) {
  const travelled = useMemo(() => travelledPoints(props.route, props.fraction), [props.route, props.fraction]);
  if (props.route.points.length < 2) return null;
  return (
    <group>
      <Line
        points={props.route.points}
        color={props.color}
        lineWidth={2}
        transparent
        opacity={0.3}
        depthTest={false}
        depthWrite={false}
        renderOrder={9}
      />
      {travelled.length >= 2 ? (
        <Line
          points={travelled}
          color={props.color}
          lineWidth={4}
          depthTest={false}
          depthWrite={false}
          renderOrder={10}
        />
      ) : null}
    </group>
  );
});
