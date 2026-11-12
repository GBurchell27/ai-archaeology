"use client";

import { yearToTrack, type YearRange } from "@/lib/timeline";
import { PERIOD_COLOR } from "@/lib/wikidata";

export function OccupationBar(props: {
  segments: { id: string; start: number; end: number }[];
  range?: YearRange;
}) {
  if (props.segments.length === 0 && !props.range) {
    return <p>No dated occupation is recorded for this place.</p>;
  }
  const window = props.range
    ? { left: yearToTrack(props.range.start) * 100, right: yearToTrack(props.range.end) * 100 }
    : null;
  return (
    <div className="timeline" data-role="timeline" aria-label="Occupation timeline">
      {window ? (
        <span
          className="timeline-window"
          data-role="timeline-window"
          style={{ left: `${window.left}%`, width: `${Math.max(0.8, window.right - window.left)}%` }}
        />
      ) : null}
      {props.segments.map((segment) => {
        const left = yearToTrack(segment.start) * 100;
        const width = Math.max(1.2, yearToTrack(segment.end) * 100 - left);
        return <i key={`${segment.id}-${segment.start}`} style={{ left: `${left}%`, width: `${width}%`, background: PERIOD_COLOR[segment.id] ?? "#c4b59a" }} />;
      })}
    </div>
  );
}
