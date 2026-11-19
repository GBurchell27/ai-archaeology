import { describeNamedPeriod, type NamedPeriod } from "@/lib/world/namedPeriods";

/** A named interval marked on a timeline track: a band with its name under it and its source in the tooltip. */
export function TimelineIntervalBand(props: {
  period: NamedPeriod;
  /** 0–1 position of a year along the track it is drawn on. */
  yearToTrack(year: number): number;
  className: string;
  labelClassName: string;
}) {
  const left = props.yearToTrack(props.period.span[0]) * 100;
  const width = props.yearToTrack(props.period.span[1]) * 100 - left;
  return (
    <i
      className={props.className}
      style={{ left: `${left}%`, width: `${width}%` }}
      title={describeNamedPeriod(props.period)}
      data-interval={props.period.id}
    >
      <span className={props.labelClassName}>{props.period.name}</span>
    </i>
  );
}
