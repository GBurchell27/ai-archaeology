"use client";

import { CloseButton } from "@/components/chrome/CloseButton";
import { useDismissLayer } from "@/components/chrome/useDismissLayer";
import { DISMISS_PRIORITY } from "@/lib/chrome/dismissStack";
import { SafeLink } from "@/components/SafeLink";

export interface ClimateRecord {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  units: string;
  citation: string;
  sourceUrl: string;
  series: [number, number][];
}

export function ClimateChart(props: { record: ClimateRecord; onClose: () => void }) {
  const series = props.record.series;
  const years = series.map((pair) => pair[0]);
  const values = series.map((pair) => pair[1]);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const width = 360;
  const height = 148;
  const pad = 16;
  const xOf = (year: number) => pad + ((year - minYear) / Math.max(maxYear - minYear, 1)) * (width - pad * 2);
  const yOf = (value: number) => pad + (1 - (value - minValue) / Math.max(maxValue - minValue, 0.001)) * (height - pad * 2);
  const path = series.map((pair, index) => `${index === 0 ? "M" : "L"}${xOf(pair[0]).toFixed(1)},${yOf(pair[1]).toFixed(1)}`).join(" ");
  const marks = [
    { year: -6200, label: "8.2 ka" },
    { year: -2200, label: "4.2 ka" },
  ].filter((mark) => mark.year >= minYear && mark.year <= maxYear);
  useDismissLayer(true, props.onClose, DISMISS_PRIORITY.panel);
  return (
    <aside className="panel is-in chart" aria-label="Palaeoclimate record" data-chart={props.record.id}>
      <CloseButton name="palaeoclimate record" action="close-chart" placement="corner" onClick={props.onClose} />
      <h2>{props.record.name}</h2>
      <p className="muted">{props.record.units}</p>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${props.record.name} time series`}>
        {marks.map((mark) => (
          <g key={mark.label}>
            <line x1={xOf(mark.year)} x2={xOf(mark.year)} y1={pad} y2={height - pad} />
            <text x={xOf(mark.year) + 4} y={pad + 10}>{mark.label}</text>
          </g>
        ))}
        <path d={path} />
      </svg>
      <p>This record shows the published measurements. The lines mark about 6200 BCE (8.2 ka) and 2200 BCE (4.2 ka). The effect of the 8.2 ka event on early farming is debated.</p>
      <p className="source-line"><SafeLink href={props.record.sourceUrl}>{props.record.citation}</SafeLink></p>
    </aside>
  );
}
