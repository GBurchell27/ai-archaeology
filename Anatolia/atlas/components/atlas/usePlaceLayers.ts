import { useEffect, useState } from "react";
import type { DetailRecord } from "@/lib/types";

export interface PlaceLayers {
  detailLayer: string;
  setDetailLayer: (layer: string) => void;
  compare: boolean;
  setCompare: (enabled: boolean) => void;
  compareLayer: string;
  setCompareLayer: (layer: string) => void;
  split: number;
  setSplit: (value: number) => void;
  opacity: number;
  setOpacity: (value: number) => void;
}

/** Which raster the selected place shows, and the swipe comparison beside it. */
export function usePlaceLayers(detail: DetailRecord | undefined): PlaceLayers {
  const [detailLayer, setDetailLayer] = useState("hillshade");
  const [compare, setCompare] = useState(false);
  const [compareLayer, setCompareLayer] = useState("true-colour");
  const [split, setSplit] = useState(0.5);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (detail && detailLayer !== "satellite" && !detail.rasters[detailLayer]) {
      setDetailLayer("hillshade");
    }
  }, [detail, detailLayer]);

  return { detailLayer, setDetailLayer, compare, setCompare, compareLayer, setCompareLayer, split, setSplit, opacity, setOpacity };
}
