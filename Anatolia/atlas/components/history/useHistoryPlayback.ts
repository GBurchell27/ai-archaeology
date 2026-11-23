"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import {
  FILTER_COMMIT_MS,
  REDUCED_MOTION_COMMIT_MS,
  clampWindowYear,
  stepTrack,
  type PlaySpeed,
  type TrackScale,
  type YearWindow,
} from "@/lib/world/historyPlayhead";

export interface PlayheadSweep {
  /** 0–1 along the track. The year may be coarser than this. */
  track: number;
  year: number;
}

export interface HistoryPlayback {
  playing: boolean;
  speed: PlaySpeed;
  sweep: PlayheadSweep | null;
  scrubbing: boolean;
  toggle(): void;
  setSpeed(speed: PlaySpeed): void;
  scrub(year: number): void;
  endScrub(): void;
  /** Stop the sweep and show the whole chosen range again. */
  dismiss(): void;
}

interface SweepLive {
  bounds: YearWindow;
  speed: PlaySpeed;
  playing: boolean;
  track: number;
  quantize: (year: number) => number;
  scale: TrackScale;
  onCommit: (year: number | null) => void;
  lastCommitted: number | null;
  lastCommitMs: number;
  scrubTimer: number;
  clockTimer: number;
  armed: boolean;
}

/** Play, pause, speed and scrub. The marker moves on a short timer; the site filter hears coarser years. */
export function useHistoryPlayback(options: {
  bounds: YearWindow;
  quantize: (year: number) => number;
  scale: TrackScale;
  onCommit(year: number | null): void;
}): HistoryPlayback {
  const { bounds, quantize, scale, onCommit } = options;
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeedState] = useState<PlaySpeed>(1);
  const [sweep, setSweep] = useState<PlayheadSweep | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const live = useLive(bounds, quantize, scale, onCommit);
  syncLive(live.current, { bounds, speed, quantize, scale, onCommit, playing });
  const sweepRef = useRef(sweep);
  sweepRef.current = sweep;

  const dismiss = useCallback(() => {
    dismissSweep(live.current);
    setPlaying(false);
    setScrubbing(false);
    setSweep(null);
  }, [live]);
  useBoundReset(bounds, dismiss);
  usePlayClock(playing, live, setPlaying, setSweep);
  useEffect(() => () => {
    haltClock(live.current);
    window.clearTimeout(live.current.scrubTimer);
  }, [live]);

  const toggle = useCallback(() => toggleSweep(live.current, sweepRef, setPlaying, setSweep), [live]);
  const setSpeed = useCallback((next: PlaySpeed) => {
    live.current.speed = next;
    setSpeedState(next);
  }, [live]);
  const scrub = useCallback((year: number) => beginScrub(live.current, sweepRef, year, setPlaying, setSweep, setScrubbing), [live]);
  const endScrub = useCallback(() => {
    setScrubbing(false);
    flushCommit(live.current);
  }, [live]);

  return { playing, speed, sweep, scrubbing, toggle, setSpeed, scrub, endScrub, dismiss };
}

function useLive(
  bounds: YearWindow,
  quantize: (year: number) => number,
  scale: TrackScale,
  onCommit: (year: number | null) => void,
): MutableRefObject<SweepLive> {
  const live = useRef<SweepLive | null>(null);
  if (live.current === null) {
    live.current = {
      bounds, speed: 1, playing: false, track: scale.yearToTrack(bounds.start),
      quantize, scale, onCommit, lastCommitted: null, lastCommitMs: 0,
      scrubTimer: 0, clockTimer: 0, armed: false,
    };
  }
  return live as MutableRefObject<SweepLive>;
}

function syncLive(live: SweepLive, next: Pick<SweepLive, "bounds" | "speed" | "quantize" | "scale" | "onCommit" | "playing">): void {
  live.bounds = next.bounds;
  live.speed = next.speed;
  live.playing = next.playing;
  live.quantize = next.quantize;
  live.scale = next.scale;
  live.onCommit = next.onCommit;
}

function useBoundReset(bounds: YearWindow, dismiss: () => void): void {
  const key = `${bounds.start}:${bounds.end}`;
  const seen = useRef(key);
  useLayoutEffect(() => {
    if (seen.current === key) return;
    seen.current = key;
    dismiss();
  }, [key, dismiss]);
}

function toggleSweep(
  live: SweepLive,
  sweepRef: MutableRefObject<PlayheadSweep | null>,
  setPlaying: (playing: boolean) => void,
  setSweep: (sweep: PlayheadSweep) => void,
): void {
  if (live.playing) {
    haltClock(live);
    setPlaying(false);
    return;
  }
  const endTrack = live.scale.yearToTrack(live.bounds.end);
  // The displayed year can sit a fraction short of the end, so the track position decides a restart.
  const finished = sweepRef.current === null || live.track >= endTrack - 1e-3;
  if (finished) live.track = live.scale.yearToTrack(live.bounds.start);
  const next = { track: live.track, year: live.scale.trackToYear(live.track) };
  sweepRef.current = next;
  setSweep(next);
  publish(live, live.quantize(next.year));
  live.playing = true;
  setPlaying(true);
}

function beginScrub(
  live: SweepLive,
  sweepRef: MutableRefObject<PlayheadSweep | null>,
  year: number,
  setPlaying: (playing: boolean) => void,
  setSweep: (sweep: PlayheadSweep) => void,
  setScrubbing: (scrubbing: boolean) => void,
): void {
  haltClock(live);
  setPlaying(false);
  setScrubbing(true);
  const placed = placeAt(live, year);
  sweepRef.current = placed;
  setSweep(placed);
  scheduleCommit(live);
}

function usePlayClock(
  playing: boolean,
  live: MutableRefObject<SweepLive>,
  setPlaying: Dispatch<SetStateAction<boolean>>,
  setSweep: Dispatch<SetStateAction<PlayheadSweep | null>>,
): void {
  useEffect(() => {
    if (!playing) return undefined;
    return startClock(live.current, setPlaying, setSweep);
  }, [playing, live, setPlaying, setSweep]);
}

function startClock(
  current: SweepLive,
  setPlaying: Dispatch<SetStateAction<boolean>>,
  setSweep: Dispatch<SetStateAction<PlayheadSweep | null>>,
): () => void {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = query.matches;
  let last = performance.now();
  const onChange = () => { reduced = query.matches; };
  query.addEventListener("change", onChange);
  current.armed = true;
  const tick = () => {
    const time = performance.now();
    const elapsed = (time - last) / 1000;
    last = time;
    stepClock(current, elapsed, reduced, setSweep, setPlaying, arm);
  };
  const arm = () => {
    current.clockTimer = window.setTimeout(tick, reduced ? REDUCED_MOTION_COMMIT_MS : FILTER_COMMIT_MS);
  };
  arm();
  return () => {
    haltClock(current);
    query.removeEventListener("change", onChange);
  };
}

function stepClock(
  current: SweepLive,
  elapsed: number,
  reduced: boolean,
  setSweep: Dispatch<SetStateAction<PlayheadSweep | null>>,
  setPlaying: Dispatch<SetStateAction<boolean>>,
  arm: () => void,
): void {
  if (!current.armed) return;
  const stepped = stepTrack({
    track: current.track,
    startTrack: current.scale.yearToTrack(current.bounds.start),
    endTrack: current.scale.yearToTrack(current.bounds.end),
    elapsedSeconds: elapsed,
    speed: current.speed,
    reducedMotion: reduced,
  });
  current.track = stepped.track;
  const year = current.scale.trackToYear(stepped.track);
  setSweep({ track: stepped.track, year });
  publish(current, current.quantize(year));
  if (!stepped.done) {
    arm();
    return;
  }
  current.playing = false;
  current.armed = false;
  setPlaying(false);
}

function placeAt(live: SweepLive, year: number): PlayheadSweep {
  const clamped = clampWindowYear(live.bounds, year);
  live.track = live.scale.yearToTrack(clamped);
  return { track: live.track, year: clamped };
}

function scheduleCommit(live: SweepLive): void {
  const wait = FILTER_COMMIT_MS - (performance.now() - live.lastCommitMs);
  if (wait <= 0) {
    window.clearTimeout(live.scrubTimer);
    live.scrubTimer = 0;
    publish(live, live.quantize(live.scale.trackToYear(live.track)));
    return;
  }
  if (live.scrubTimer) return;
  live.scrubTimer = window.setTimeout(() => {
    live.scrubTimer = 0;
    publish(live, live.quantize(live.scale.trackToYear(live.track)));
  }, wait);
}

function flushCommit(live: SweepLive): void {
  window.clearTimeout(live.scrubTimer);
  live.scrubTimer = 0;
  publish(live, live.quantize(live.scale.trackToYear(live.track)));
}

function publish(live: SweepLive, year: number | null): void {
  if (year === live.lastCommitted) return;
  live.lastCommitted = year;
  live.lastCommitMs = performance.now();
  live.onCommit(year);
}

function haltClock(live: SweepLive): void {
  live.armed = false;
  live.playing = false;
  window.clearTimeout(live.clockTimer);
  live.clockTimer = 0;
}

function dismissSweep(live: SweepLive): void {
  haltClock(live);
  window.clearTimeout(live.scrubTimer);
  live.scrubTimer = 0;
  live.track = live.scale.yearToTrack(live.bounds.start);
  publish(live, null);
}
