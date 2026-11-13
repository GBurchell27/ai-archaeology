import { clampToSpan, type TripSpan } from "@/lib/trip/tripTimeline";
import type { PlaybackRate } from "@/lib/trip/tripPlayback";

export interface TripClockState {
  timeMs: number;
  playing: boolean;
}

type Listener = () => void;

const MAX_FRAME_MS = 100;

/**
 * The replay position as an external store, so the scrubber and the 3D layer can follow it
 * every frame without re-rendering the whole atlas.
 */
export class TripClock {
  private state: TripClockState;
  private readonly listeners = new Set<Listener>();
  private frame: number | null = null;
  private lastFrameMs = 0;

  constructor(readonly span: TripSpan, private readonly rateAt: PlaybackRate) {
    this.state = { timeMs: span.startMs, playing: false };
  }

  getSnapshot = (): TripClockState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  seek(timeMs: number): void {
    this.update({ timeMs: clampToSpan(this.span, timeMs) });
  }

  togglePlay(): void {
    if (this.state.playing) this.pause();
    else this.play();
  }

  play(): void {
    if (this.state.playing) return;
    const restart = this.state.timeMs >= this.span.endMs;
    this.update({ playing: true, timeMs: restart ? this.span.startMs : this.state.timeMs });
    this.lastFrameMs = performance.now();
    this.frame = requestAnimationFrame(this.advance);
  }

  pause(): void {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    if (this.state.playing) this.update({ playing: false });
  }

  private advance = (now: number): void => {
    const elapsed = Math.min(MAX_FRAME_MS, Math.max(0, now - this.lastFrameMs));
    this.lastFrameMs = now;
    const next = clampToSpan(this.span, this.state.timeMs + elapsed * this.rateAt(this.state.timeMs));
    const finished = next >= this.span.endMs;
    this.update({ timeMs: next, playing: !finished });
    this.frame = finished ? null : requestAnimationFrame(this.advance);
  };

  private update(change: Partial<TripClockState>): void {
    const next = { ...this.state, ...change };
    if (next.timeMs === this.state.timeMs && next.playing === this.state.playing) return;
    this.state = next;
    this.listeners.forEach((listener) => listener());
  }
}
