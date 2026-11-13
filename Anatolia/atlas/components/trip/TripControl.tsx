"use client";

import { useMemo } from "react";
import styles from "@/components/trip/TripControl.module.css";
import { TripTrack } from "@/components/trip/TripTrack";
import { useTripClockState } from "@/components/trip/useTripReplay";
import { activityKicker, clockLabel, localTimeZone, roadSummary, zoneLabel } from "@/lib/trip/tripFormat";
import type { TripReplay } from "@/lib/trip/tripReplay";
import { roadFor, type TripRoads } from "@/lib/trip/tripRoads";
import { MODE_COLORS, MODE_NAMES } from "@/lib/trip/tripStyle";
import { adjacentBoundary, dayMarks, locateSegment } from "@/lib/trip/tripTimeline";
import type { TravelMode } from "@/lib/trip/tripTypes";

const TRIP_DAY_ZONE = "Europe/Istanbul";

/** Scrubber for replaying a trip: play, step between stops, drag through time. */
export function TripControl(props: {
  replay: TripReplay;
  roads: TripRoads | null;
  follow: boolean;
  onFollow: (follow: boolean) => void;
  onClose: () => void;
}) {
  const { clock, timed, span, trip } = props.replay;
  const { timeMs, playing } = useTripClockState(clock);
  const days = useMemo(() => dayMarks(span, TRIP_DAY_ZONE), [span]);
  const location = locateSegment(timed, timeMs);
  const { segment } = location.timed;
  const timeZone = localTimeZone(location);
  const clockText = clockLabel(timeMs, timeZone);
  const road = segment.kind === "travel" ? roadFor(props.roads, segment) : undefined;
  const step = (direction: 1 | -1) => {
    clock.pause();
    clock.seek(adjacentBoundary(timed, clock.getSnapshot().timeMs, direction));
  };

  return (
    <section className={styles.bar} data-role="trip-control" data-playing={playing} aria-label={trip.title}>
      <div className={styles.header}>
        <button type="button" className={styles.play} data-action="trip-play" aria-pressed={playing} onClick={() => clock.togglePlay()}>
          {playing ? "Pause" : "Play"}
        </button>
        <button type="button" className={styles.step} aria-label="Previous stop" onClick={() => step(-1)}>‹</button>
        <button type="button" className={styles.step} aria-label="Next stop" onClick={() => step(1)}>›</button>
        <div className={styles.readout}>
          <p className={styles.clock}>
            <strong data-role="trip-clock">{clockText}</strong>
            <span>{zoneLabel(timeZone)}</span>
          </p>
          <p className={styles.kicker}>{activityKicker(location)}</p>
          <p className={styles.title} data-role="trip-activity">{segment.title}</p>
        </div>
        <label className={styles.follow}>
          <input type="checkbox" checked={props.follow} onChange={(event) => props.onFollow(event.target.checked)} />
          Follow
        </label>
        <button type="button" className={styles.close} aria-label="Close trip replay" onClick={props.onClose}>×</button>
      </div>
      <TripTrack
        span={span}
        timed={timed}
        days={days}
        timeMs={timeMs}
        readTimeMs={() => clock.getSnapshot().timeMs}
        valueText={`${clockText}, ${segment.title}`}
        onSeek={(next) => clock.seek(next)}
        onScrubStart={() => clock.pause()}
      />
      <div className={styles.footer}>
        <p className={styles.note}>
          {segment.note ?? ""}
          {road && segment.kind === "travel" ? <span> {roadSummary(road, segment.mode)}</span> : null}
          {segment.estimatedTimes ? <em> Times for this part are estimated.</em> : null}
        </p>
        <div className={styles.footerSide}>
          <ModeLegend />
          {props.roads ? <p className={styles.credit}>Roads © OpenStreetMap contributors</p> : null}
        </div>
      </div>
    </section>
  );
}

function ModeLegend() {
  return (
    <ul className={styles.legend} aria-label="Line colours">
      {(Object.keys(MODE_COLORS) as TravelMode[]).map((mode) => (
        <li key={mode}><i style={{ background: MODE_COLORS[mode] }} />{MODE_NAMES[mode]}</li>
      ))}
    </ul>
  );
}
