"use client";

import { activeNamedPeriod, describeNamedPeriod, type NamedPeriod } from "@/lib/world/namedPeriods";
import type { YearSpan } from "@/lib/world/worldEras";

/**
 * Chips for the named periods that apply to the view. Pressing one sets the year range to that period;
 * pressing the lit one again asks for the whole range (null). Shared by the globe and the Anatolia timelines,
 * which pass their own chip classes.
 */
export function NamedPeriodChips(props: {
  periods: readonly NamedPeriod[];
  startYear: number;
  endYear: number;
  className: string;
  chipClassName(pressed: boolean): string;
  onSpan(span: YearSpan | null): void;
}) {
  const active = activeNamedPeriod(props.periods, props.startYear, props.endYear);
  return (
    <div className={props.className} role="group" aria-label="Named periods" data-role="named-periods">
      {props.periods.map((period) => {
        const pressed = active?.id === period.id;
        return (
          <button
            key={period.id}
            type="button"
            className={props.chipClassName(pressed)}
            data-named-period={period.id}
            aria-pressed={pressed}
            title={describeNamedPeriod(period)}
            onClick={() => props.onSpan(pressed ? null : period.span)}
          >
            {period.name}
          </button>
        );
      })}
    </div>
  );
}
