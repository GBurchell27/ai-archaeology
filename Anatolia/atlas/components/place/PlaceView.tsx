"use client";

import { useCallback, useEffect, useState } from "react";
import { naturalExaggeration } from "@/lib/exaggeration";
import { DEFAULT_SUN_AZIMUTH, type DrapeId } from "@/lib/place/placeDrape";
import { usePlaceSite } from "@/lib/place/placeSite";
import { usePlaceTerrain } from "@/lib/place/usePlaceTerrain";
import { NorthArrow, PlaceFooter, PlaceHeader } from "./PlaceChrome";
import { PlaceControls } from "./PlaceControls";
import { PlaceScene, type PlaceViewReadout } from "./PlaceScene";
import { PlaceError, PlaceLoading } from "./PlaceStatus";
import styles from "./PlaceView.module.css";

/** Close-up terrain for one published site. Contract: default export, props { siteId, onExit }. */
export default function PlaceView({ siteId, onExit }: { siteId: string; onExit: () => void }) {
  const site = usePlaceSite(siteId);
  const { state, retry } = usePlaceTerrain(siteId);
  const [drape, setDrape] = useState<DrapeId>("satellite");
  const [chosenExaggeration, setExaggeration] = useState<number | null>(null);
  const [sunAzimuth, setSunAzimuth] = useState(DEFAULT_SUN_AZIMUTH);
  const [resetToken, setResetToken] = useState(0);
  const [readout, setReadout] = useState<PlaceViewReadout | null>(null);
  const [draped, setDraped] = useState(false);
  const [drapeFailed, setDrapeFailed] = useState(false);

  useEffect(() => {
    const leaveOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onExit();
    };
    window.addEventListener("keydown", leaveOnEscape);
    return () => window.removeEventListener("keydown", leaveOnEscape);
  }, [onExit]);

  const markDraped = useCallback(() => setDraped(true), []);
  const markDrapeFailed = useCallback(() => setDrapeFailed(true), []);
  const retryAll = useCallback(() => {
    setDrapeFailed(false);
    setDraped(false);
    retry();
  }, [retry]);

  const terrain = state.status === "ready" && !drapeFailed ? state.terrain : null;
  const failure = drapeFailed ? "failed" : state.status === "error" ? state.failure : null;
  const exaggeration = chosenExaggeration ?? (terrain ? naturalExaggeration(terrain.meta.groundPixelSizeM) : 1.5);
  const ready = Boolean(terrain) && draped;

  return (
    <div className={styles.place} data-view="place" data-site={siteId} data-place-state={failure ? "error" : ready ? "ready" : "loading"}>
      {terrain ? (
        <PlaceScene
          siteId={siteId}
          terrain={terrain}
          site={site ?? null}
          drape={drape}
          exaggeration={exaggeration}
          sunAzimuth={sunAzimuth}
          resetToken={resetToken}
          onReady={markDraped}
          onFail={markDrapeFailed}
          onView={setReadout}
        />
      ) : null}
      <div className={styles.chrome}>
        <PlaceHeader site={site} siteId={siteId} onExit={onExit} />
        {ready && readout ? <NorthArrow heading={readout.heading} /> : null}
        {failure ? <PlaceError failure={failure} onRetry={retryAll} onExit={onExit} /> : null}
        {!failure && !ready ? <PlaceLoading name={site?.name ?? null} draping={Boolean(terrain)} /> : null}
        {ready && terrain ? (
          <div className={styles.bottom}>
            <PlaceControls
              drape={drape}
              exaggeration={exaggeration}
              sunAzimuth={sunAzimuth}
              onDrape={setDrape}
              onExaggeration={setExaggeration}
              onSunAzimuth={setSunAzimuth}
              onResetView={() => setResetToken((token) => token + 1)}
            />
            <PlaceFooter meta={terrain.meta} site={site} bar={readout?.bar ?? null} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
