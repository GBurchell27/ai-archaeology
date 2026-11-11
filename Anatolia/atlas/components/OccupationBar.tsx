"use client";

import { PERIOD_COLOR } from "@/lib/wikidata";

const AXIS: [number, number] = [-9600, 1600];

export function OccupationBar(props: { segments: { id: string; start: number; end: number }[] }) {
  if (props.segments.length === 0) {
    return <p>No dated occupation is recorded for this place.</p>;
  }
  return (
    <div className="timeline" data-role="timeline" aria-label="Occupation timeline">
      {props.segments.map((segment) => {
        const left = percent(segment.start);
        const width = Math.max(1.2, percent(segment.end) - left);
        return <i key={`${segment.id}-${segment.start}`} style={{ left: `${left}%`, width: `${width}%`, background: PERIOD_COLOR[segment.id] ?? "#c4b59a" }} />;
      })}
    </div>
  );
}

function percent(year: number): number {
  const [start, end] = AXIS;
  const clamped = Math.min(end, Math.max(start, year));
  return ((clamped - start) / (end - start)) * 100;
}
