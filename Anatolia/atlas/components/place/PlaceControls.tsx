"use client";

import { compassPoint, DRAPE_IDS, DRAPES, type DrapeId } from "@/lib/place/placeDrape";
import styles from "./PlaceView.module.css";

export const MIN_EXAGGERATION = 1;
export const MAX_EXAGGERATION = 4;

/** Drape switch, relief height, sun bearing and view reset. */
export function PlaceControls(props: {
  drape: DrapeId;
  exaggeration: number;
  sunAzimuth: number;
  onDrape: (drape: DrapeId) => void;
  onExaggeration: (value: number) => void;
  onSunAzimuth: (degrees: number) => void;
  onResetView: () => void;
}) {
  return (
    <section className={styles.controls} aria-label="Terrain display">
      <fieldset className={styles.drapes}>
        <legend className={styles.controlLabel}>Surface</legend>
        {DRAPE_IDS.map((id) => (
          <label key={id} className={styles.drape}>
            <input type="radio" name="place-drape" checked={props.drape === id} onChange={() => props.onDrape(id)} />
            <span>{DRAPES[id].label}</span>
          </label>
        ))}
      </fieldset>
      <label className={styles.slider}>
        <span className={styles.controlLabel}>Relief height</span>
        <output className={styles.sliderValue}>{props.exaggeration.toFixed(1)}×</output>
        <input
          type="range"
          min={MIN_EXAGGERATION}
          max={MAX_EXAGGERATION}
          step={0.1}
          value={props.exaggeration}
          aria-valuetext={`${props.exaggeration.toFixed(1)} times true height`}
          onChange={(event) => props.onExaggeration(Number(event.target.value))}
        />
      </label>
      <label className={styles.slider}>
        <span className={styles.controlLabel}>Sun from</span>
        <output className={styles.sliderValue}>{compassPoint(props.sunAzimuth)} · {props.sunAzimuth}°</output>
        <input
          type="range"
          min={0}
          max={355}
          step={5}
          value={props.sunAzimuth}
          aria-valuetext={`${compassPoint(props.sunAzimuth)}, ${props.sunAzimuth} degrees`}
          onChange={(event) => props.onSunAzimuth(Number(event.target.value))}
        />
      </label>
      <p className={styles.hint}>Low, raking light is how faint banks and ditches show up. Swing the sun on Hillshade.</p>
      <button type="button" className={styles.reset} onClick={props.onResetView}>Reset view</button>
    </section>
  );
}
