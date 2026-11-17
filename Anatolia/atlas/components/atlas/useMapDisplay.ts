import { useCallback, useState } from "react";
import type { BaseMap, LayerId } from "@/lib/types";

export interface MapDisplay {
  baseMap: BaseMap;
  setBaseMap: (base: BaseMap) => void;
  layers: Record<LayerId, boolean>;
  setLayer: (layer: LayerId, enabled: boolean) => void;
  toggleLayer: (layer: LayerId) => void;
  wikiOn: boolean;
  setWikiOn: (enabled: boolean) => void;
  exaggeration: number;
  setExaggeration: (value: number) => void;
  azimuth: number;
  setAzimuth: (value: number) => void;
  altitude: number;
  setAltitude: (value: number) => void;
  labels: boolean;
  setLabels: (value: boolean) => void;
}

/** How the national map is drawn: base map, pin layers, relief exaggeration and sun. */
export function useMapDisplay(): MapDisplay {
  const [baseMap, setBaseMap] = useState<BaseMap>("hypsometric");
  const [layers, setLayers] = useState<Record<LayerId, boolean>>({
    neolithic: true,
    bronze: true,
    classical: true,
    crusader: true,
  });
  const [wikiOn, setWikiOn] = useState(true);
  const [exaggeration, setExaggeration] = useState(6.5);
  const [azimuth, setAzimuth] = useState(315);
  const [altitude, setAltitude] = useState(40);
  const [labels, setLabels] = useState(false);
  const setLayer = useCallback((layer: LayerId, enabled: boolean) => {
    setLayers((current) => ({ ...current, [layer]: enabled }));
  }, []);
  const toggleLayer = useCallback((layer: LayerId) => {
    setLayers((current) => ({ ...current, [layer]: !current[layer] }));
  }, []);
  return {
    baseMap, setBaseMap, layers, setLayer, toggleLayer, wikiOn, setWikiOn,
    exaggeration, setExaggeration, azimuth, setAzimuth, altitude, setAltitude, labels, setLabels,
  };
}
