"use client";

import { SafeLink } from "@/components/SafeLink";

const LICENCE = "CC BY-NC-SA 4.0";
const LICENCE_URL = "https://creativecommons.org/licenses/by-nc-sa/4.0/";

export function CreditLine(props: { text: string }) {
  const index = props.text.indexOf(LICENCE);
  if (index < 0) return <>{props.text}</>;
  return (
    <>
      {props.text.slice(0, index)}
      <SafeLink href={LICENCE_URL}>{LICENCE}</SafeLink>
      {props.text.slice(index + LICENCE.length)}
    </>
  );
}

const CONTEXT = [
  ["rivers", "Present-day rivers"],
  ["lakes", "Present-day lakes"],
  ["paleo-water", "Approximate paleolakes"],
  ["roads", "Roman roads"],
  ["clay", "Soil clay"],
  ["soc", "Soil organic carbon"],
  ["climate", "Palaeoclimate records"],
] as const;

export function closeupCreditNote(credit?: { relief: string; satellite: string } | null): string {
  const lines = [credit?.satellite, credit?.relief].filter((line): line is string => Boolean(line));
  if (lines.length === 0) return "Fetching relief and Sentinel-2 for this published place.";
  return lines.join(" ");
}

export function PlaceMaps(props: {
  reliefOn: boolean;
  sentinelOn: boolean;
  coronaOn: boolean;
  coronaAvailable: boolean;
  onRelief: () => void;
  onSentinel: () => void;
  onCorona: () => void;
  contextOn: Record<string, boolean>;
  onContext: (id: string, enabled: boolean) => void;
  note?: string;
}) {
  return (
    <section className="place-layers">
      <h2>Map</h2>
      <label className="check">
        <input type="radio" name="place-map" data-place-layer="relief" checked={props.reliefOn} onChange={props.onRelief} />
        Relief
      </label>
      <label className="check">
        <input type="radio" name="place-map" data-place-layer="sentinel" checked={props.sentinelOn} onChange={props.onSentinel} />
        Sentinel-2
      </label>
      <label className="check">
        <input type="radio" name="place-map" data-place-layer="corona" checked={props.coronaOn} disabled={!props.coronaAvailable} onChange={props.onCorona} />
        CORONA{props.coronaAvailable ? "" : " (no frame for this place)"}
      </label>
      {props.note ? <p className="muted"><CreditLine text={props.note} /></p> : null}
      <h2>Context</h2>
      {CONTEXT.map(([id, title]) => (
        <label className="check" key={id}>
          <input
            type="checkbox"
            checked={props.contextOn[id]}
            data-panel-context={id}
            onChange={(event) => props.onContext(id, event.target.checked)}
          />
          {title}
        </label>
      ))}
    </section>
  );
}
