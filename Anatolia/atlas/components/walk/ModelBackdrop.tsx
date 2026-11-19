"use client";

import { useEffect, useRef } from "react";
import type { DirectionalLight } from "three";
import { EVENING_LIGHT, SUN_SHADOW } from "./eveningLight";
import { ModelFloor } from "./ModelFloor";
import { ModelSky } from "./ModelSky";

const FLOOR_RADIUS_M = 320;

/** Draws the sun's shadow map once, and again whenever `castersKey` changes, instead of on every frame. */
function useStillShadows(castersKey: string) {
  const sunLight = useRef<DirectionalLight>(null);
  useEffect(() => {
    const shadow = sunLight.current?.shadow;
    if (!shadow) return;
    shadow.autoUpdate = false;
    shadow.needsUpdate = true;
  }, [castersKey]);
  return sunLight;
}

/** The sun with its shadow map, and the shadowless fills that shape whatever stands in shade. */
function EveningLights({ castersKey }: { castersKey: string }) {
  const { sun, skyFill, sunGlow, farSky } = EVENING_LIGHT;
  const { reachM, mapPx, distanceM, bias, normalBias } = SUN_SHADOW;
  const sunLight = useStillShadows(castersKey);
  // The sine of the sun's height: how much shorter the ground looks along the ray than across it.
  const foreshortening = sun.direction.y;
  return (
    <>
      <hemisphereLight args={[skyFill.skyColour, skyFill.groundColour, skyFill.intensity]} />
      <directionalLight position={sunGlow.direction} color={sunGlow.colour} intensity={sunGlow.intensity} />
      <directionalLight position={farSky.direction} color={farSky.colour} intensity={farSky.intensity} />
      <directionalLight
        ref={sunLight}
        position={sun.direction.clone().multiplyScalar(distanceM)}
        color={sun.colour}
        intensity={sun.intensity}
        castShadow
        shadow-mapSize={[mapPx, Math.round(mapPx * foreshortening)]}
        shadow-bias={bias}
        shadow-normalBias={normalBias}
      >
        <orthographicCamera attach="shadow-camera" args={[-reachM, reachM, reachM * foreshortening, -reachM * foreshortening, 1, 2 * distanceM]} />
      </directionalLight>
    </>
  );
}

/**
 * Everything around a model that is not the model: evening sky, far hills, the ground, the light and haze.
 * `groundLevelM` lowers the ground and the hills for a site whose model stands above the plain. `shadowCastersKey`
 * names what is drawn: the shadows are drawn again when it changes.
 */
export function ModelBackdrop({ grassed, groundLevelM = 0, shadowCastersKey }: { grassed: boolean; groundLevelM?: number; shadowCastersKey: string }) {
  const { haze } = EVENING_LIGHT;
  return (
    <>
      <fog attach="fog" args={[haze.colour, haze.nearM, haze.farM]} />
      <ModelSky groundLevelM={groundLevelM} />
      <group position={[0, groundLevelM, 0]}>
        <ModelFloor radiusM={FLOOR_RADIUS_M} grassed={grassed} />
      </group>
      <EveningLights castersKey={shadowCastersKey} />
    </>
  );
}
