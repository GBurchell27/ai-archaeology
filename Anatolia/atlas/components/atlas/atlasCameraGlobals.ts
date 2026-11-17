interface Point3 { x: number; y: number; z: number }

type CameraWindow = Window & {
  __atlasCamera?: { position: Point3 };
  __atlasControls?: { target: Point3 } | null;
};

export interface AtlasCameraState {
  /** The point the camera looks at, in the atlas's local metres. */
  target: Point3;
  /** Straight-line distance from the camera to that point. */
  distance: number;
}

// shortcut: reads the camera through AtlasCamera's window globals; pass a camera ref down if AtlasScene gains one.
export function readAtlasCamera(): AtlasCameraState | null {
  const { __atlasCamera: camera, __atlasControls: controls } = window as CameraWindow;
  if (!camera || !controls) return null;
  const { position } = camera;
  const { target } = controls;
  return { target, distance: Math.hypot(position.x - target.x, position.y - target.y, position.z - target.z) };
}

/** AtlasCamera never clears its globals; a stale camera would mislead the next atlas the coordinator mounts. */
export function forgetAtlasCamera(): void {
  delete (window as CameraWindow).__atlasCamera;
  delete (window as CameraWindow).__atlasControls;
}
