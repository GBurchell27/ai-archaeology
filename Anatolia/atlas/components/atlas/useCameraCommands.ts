import { useCallback, useState } from "react";
import type { CameraPose, ZoomCommand } from "@/components/AtlasCamera";

export interface CameraCommands {
  pose: CameraPose | null;
  setPose: (pose: CameraPose) => void;
  flightCancel: number;
  stopFlight: () => void;
  zoomCommand: ZoomCommand;
  zoomMap: (steps: number) => void;
}

/** The instructions the atlas sends its camera: where to fly, when to stop, how far to zoom. */
export function useCameraCommands(): CameraCommands {
  const [pose, setPose] = useState<CameraPose | null>(null);
  const [flightCancel, setFlightCancel] = useState(0);
  const [zoomCommand, setZoomCommand] = useState<ZoomCommand>({ steps: 0, token: 0 });
  const stopFlight = useCallback(() => {
    document.body.dataset.flying = "false";
    setFlightCancel((token) => token + 1);
  }, []);
  const zoomMap = useCallback((steps: number) => {
    setZoomCommand((previous) => ({ steps, token: previous.token + 1 }));
  }, []);
  return { pose, setPose, flightCancel, stopFlight, zoomCommand, zoomMap };
}
