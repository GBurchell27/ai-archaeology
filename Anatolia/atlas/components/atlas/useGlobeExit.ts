import { useCallback, useEffect, useRef } from "react";
import { overviewPose, poseDistance } from "@/lib/atlasPoses";
import { boundsCenter, mercatorToLonLat } from "@/lib/geo";
import type { AtlasMetadata } from "@/lib/types";

export interface GlobeLook {
  longitude: number;
  latitude: number;
}

interface Point3 { x: number; y: number; z: number }
type CameraWindow = Window & {
  __atlasCamera?: { position: Point3 };
  __atlasControls?: { target: Point3 } | null;
};

/** Zooming out past this multiple of the overview distance hands the view back to the globe. */
const EXIT_DISTANCE_RATIO = 1.15;
const POLL_MS = 200;
/** The camera must stay beyond the threshold this long, so a passing flick does not leave the atlas. */
const HOLD_MS = 600;

/** Returns the "back to the globe" action, or undefined when the atlas is not under a globe.
 *  Also fires it when the user zooms out well past the overview. */
export function useGlobeExit(
  onExitToGlobe: ((look: GlobeLook) => void) | undefined,
  bounds: AtlasMetadata["bounds"] | null,
): (() => void) | undefined {
  const exitRef = useRef(onExitToGlobe);
  exitRef.current = onExitToGlobe;
  const enabled = Boolean(onExitToGlobe);

  const exit = useCallback(() => {
    if (bounds) exitRef.current?.(currentLook(bounds));
  }, [bounds]);

  useEffect(() => {
    if (!enabled || !bounds) return undefined;
    // Armed only once the camera has been inside the threshold, so a far starting look does not bounce straight back.
    let armed = false;
    let beyondSince = 0;
    const timer = window.setInterval(() => {
      const distance = cameraDistance();
      if (distance == null || document.body.dataset.flying === "true") {
        beyondSince = 0;
        return;
      }
      const beyond = distance > poseDistance(overviewPose(bounds, 0)) * EXIT_DISTANCE_RATIO;
      if (!beyond) {
        armed = true;
        beyondSince = 0;
      } else if (armed) {
        beyondSince ||= performance.now();
        if (performance.now() - beyondSince >= HOLD_MS) {
          armed = false;
          exit();
        }
      }
    }, POLL_MS);
    return () => {
      window.clearInterval(timer);
      // AtlasCamera never clears its globals; a stale camera would mislead the next atlas mounted from the globe.
      delete (window as CameraWindow).__atlasCamera;
      delete (window as CameraWindow).__atlasControls;
    };
  }, [enabled, bounds, exit]);

  return enabled ? exit : undefined;
}

// shortcut: reads the camera through AtlasCamera's window globals; pass a camera ref down if AtlasScene gains one.
function cameraDistance(): number | null {
  const { __atlasCamera: camera, __atlasControls: controls } = window as CameraWindow;
  if (!camera || !controls) return null;
  const { position } = camera;
  const { target } = controls;
  return Math.hypot(position.x - target.x, position.y - target.y, position.z - target.z);
}

/** The point the camera looks at, as longitude and latitude; the map centre before the camera exists. */
function currentLook(bounds: AtlasMetadata["bounds"]): GlobeLook {
  const [originX, originY] = boundsCenter(bounds);
  const target = (window as CameraWindow).__atlasControls?.target;
  // Local z grows south, so north is the origin minus z (the inverse of lib/geo toLocal).
  const [longitude, latitude] = mercatorToLonLat(originX + (target?.x ?? 0), originY - (target?.z ?? 0));
  return { longitude, latitude };
}
