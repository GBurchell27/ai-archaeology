import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { cameraCloseness, cameraDistanceToTarget, markerScale } from "@/components/atlas/cataloguePoints";
import { pinSeparationPx, prominentPoints } from "@/lib/atlas/pinDeclutter";
import { AROUND_MARKER, placeLabels, type LabelAnchor, type LabelSide, type ScreenBox } from "@/lib/globe/labelLayout";

export type { LabelSide };

/** From the centre of a selected pin to its name: clear of the selection ring around it. */
export const SELECTED_LABEL_GAP_PX = 27;

export interface NamedPin {
  id: string;
  name: string;
  position: [number, number, number];
}

interface PinAnchor extends LabelAnchor {
  id: string;
}

const RELAYOUT_SECONDS = 0.12;
/** From the country overview a few names spread over the map; over one valley every site in view is named. */
const OVERVIEW = { names: 14, separationPx: 56 };
/** Pins nearer than this to a better-known one stand back at the overview; all of them stand by this closeness. */
const CROWD = { separationPx: 30, allShownBy: 0.4 };

export interface SitePinLayout {
  /** The side of its pin each named site's name goes on. */
  labelSides: ReadonlyMap<string, LabelSide>;
  /** Pins standing back for a better-known neighbour until the camera comes closer. */
  hiddenIds: ReadonlySet<string>;
}

const NOTHING_LAID_OUT: SitePinLayout = { labelSides: new Map(), hiddenIds: new Set() };

/**
 * Which curated pins stand, which are named, and on which side of the pin, so that no name sits on another
 * name, on a named pin or under the chrome. Pins arrive most important first; the selected one goes ahead of them.
 */
export function useSitePinLabels(pins: readonly NamedPin[], selectedId: string | null): SitePinLayout {
  const [pinLayout, setPinLayout] = useState<SitePinLayout>(NOTHING_LAID_OUT);
  const layout = useRef({ due: 0, signature: "" });
  const scratch = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, controls, clock, size, gl }) => {
    if (clock.elapsedTime < layout.current.due) return;
    layout.current.due = clock.elapsedTime + RELAYOUT_SECONDS;
    const closeness = cameraCloseness(cameraDistanceToTarget(camera, controls));
    const onScreen = anchorsOnScreen(pins, camera, size, scratch)
      .map((anchor) => (anchor.id === selectedId ? { ...anchor, markerGapPx: SELECTED_LABEL_GAP_PX } : anchor))
      .sort((left, right) => Number(right.id === selectedId) - Number(left.id === selectedId)); // stable: the rest keep their order
    const anchors = prominentPoints(onScreen, pinSeparationPx(closeness, CROWD.separationPx, CROWD.allShownBy) * markerScale(closeness, size.width));
    const hidden = onScreen.filter((anchor) => !anchors.includes(anchor)).map((anchor) => anchor.id);
    const limit = Math.round(THREE.MathUtils.lerp(OVERVIEW.names, pins.length, closeness));
    const placed = placeLabels(anchors, limit, size, chromeBoxes(gl.domElement), OVERVIEW.separationPx * (1 - closeness), AROUND_MARKER);
    const signature = `${placed.map((label) => `${label.anchor.id}${label.side}`).join("|")}#${hidden.join("|")}`;
    if (signature === layout.current.signature) return;
    layout.current.signature = signature;
    setPinLayout({ labelSides: new Map(placed.map((label) => [label.anchor.id, label.side])), hiddenIds: new Set(hidden) });
  });
  return pinLayout;
}

function anchorsOnScreen(
  pins: readonly NamedPin[],
  camera: THREE.Camera,
  size: { width: number; height: number },
  scratch: THREE.Vector3,
): PinAnchor[] {
  const anchors: PinAnchor[] = [];
  for (const pin of pins) {
    scratch.set(...pin.position).project(camera);
    if (Math.abs(scratch.x) > 1 || Math.abs(scratch.y) > 1 || Math.abs(scratch.z) > 1) continue;
    anchors.push({ id: pin.id, name: pin.name, screenX: (scratch.x * 0.5 + 0.5) * size.width, screenY: (-scratch.y * 0.5 + 0.5) * size.height });
  }
  return anchors;
}

/** The boxes of the chrome laid over the map (top bar, timeline, panels, legend), in canvas pixels. */
function chromeBoxes(canvas: HTMLCanvasElement): ScreenBox[] {
  const shell = canvas.closest(".atlas");
  if (!shell) return [];
  const frame = canvas.getBoundingClientRect();
  return [...shell.children]
    .filter((element) => !element.contains(canvas))
    .map((element) => element.getBoundingClientRect())
    .filter((box) => box.width > 0 && box.height > 0)
    .map((box) => ({ left: box.left - frame.left, right: box.right - frame.left, top: box.top - frame.top, bottom: box.bottom - frame.top }));
}
