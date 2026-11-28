"use client";

import { PLAY_SPEEDS, type PlaySpeed } from "@/lib/world/historyPlayhead";

/** Play, pause and the 1x / 2x / 4x speeds. The track that scrubs the playhead stays with the slider. */
export function PlayHistoryTransport(props: {
  playing: boolean;
  speed: PlaySpeed;
  onToggle(): void;
  onSpeed(speed: PlaySpeed): void;
  className: string;
  playClassName: string;
  speedsClassName: string;
  speedClassName: string;
}) {
  return (
    <div className={props.className} role="group" aria-label="Play history">
      <button
        type="button"
        className={props.playClassName}
        data-action="play-history"
        aria-pressed={props.playing}
        onClick={props.onToggle}
      >
        {props.playing ? "Pause" : "Play history"}
      </button>
      <div className={props.speedsClassName} role="group" aria-label="Playback speed">
        {PLAY_SPEEDS.map((speed) => (
          <button
            key={speed}
            type="button"
            className={props.speedClassName}
            data-action="play-speed"
            data-speed={speed}
            aria-pressed={props.speed === speed}
            onClick={() => props.onSpeed(speed)}
          >
            {speed}x
          </button>
        ))}
      </div>
    </div>
  );
}
