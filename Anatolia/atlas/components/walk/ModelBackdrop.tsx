"use client";

import { useEffect, useRef } from "react";
import type { DirectionalLight } from "three";
import { BUILDING_SCALE, type WalkScale } from "@/lib/walk/walkScale";
import { EVENING_LIGHT, sunShadowReaching } from "./eveningLight";
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
function EveningLights({ castersKey, shadowReachM }: { castersKey: string; shadowReachM: number }) {
  const { sun, skyFill, sunGlow, farSky } = EVENING_LIGHT;
  const { reachM, mapPx, distanceM, bias, normalBias } = sunShadowReaching(shadowReachM);
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
 * names what is drawn: the shadows are drawn again when it changes. `scale` moves the haze, the hills, the sky and
 * the edge of the ground further off, and stretches the shadow map, for a site far larger than a building.
 */
export function ModelBackdrop({ grassed, groundLevelM = 0, shadowCastersKey, scale = BUILDING_SCALE }: { grassed: boolean; groundLevelM?: number; shadowCastersKey: string; scale?: WalkScale }) {
  const { haze } = EVENING_LIGHT;
  const further = scale.backdropFactor;
  return (
    <>
      <fog attach="fog" args={[haze.colour, haze.nearM * further, haze.farM * further]} />
      <ModelSky groundLevelM={groundLevelM} scale={further} />
      <group position={[0, groundLevelM, 0]}>
        <ModelFloor radiusM={FLOOR_RADIUS_M * further} grassed={grassed} />
      </group>
      <EveningLights castersKey={shadowCastersKey} shadowReachM={scale.shadowReachM} />
    </>
  );
}
