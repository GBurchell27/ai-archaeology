import { useCallback, useState } from "react";
import type { CameraPose, ZoomCommand } from "@/components/AtlasCamera";

export interface CameraCommands {
  pose: CameraPose | null;
  /** True once the camera sits at its opening pose, so a flight has a real starting view. */
  ready: boolean;
  markReady: () => void;
  setPose: (pose: CameraPose) => void;
  flightCancel: number;
  stopFlight: () => void;
  zoomCommand: ZoomCommand;
  zoomMap: (steps: number) => void;
}

/** The instructions the atlas sends its camera: where to fly, when to stop, how far to zoom. */
export function useCameraCommands(): CameraCommands {
  const [pose, setPose] = useState<CameraPose | null>(null);
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => setReady(true), []);
  const [flightCancel, setFlightCancel] = useState(0);
  const [zoomCommand, setZoomCommand] = useState<ZoomCommand>({ steps: 0, token: 0 });
  const stopFlight = useCallback(() => {
    document.body.dataset.flying = "false";
    setFlightCancel((token) => token + 1);
  }, []);
  const zoomMap = useCallback((steps: number) => {
    setZoomCommand((previous) => ({ steps, token: previous.token + 1 }));
  }, []);
  return { pose, setPose, ready, markReady, flightCancel, stopFlight, zoomCommand, zoomMap };
}
