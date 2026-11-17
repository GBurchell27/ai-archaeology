import { useCallback, useEffect, useState } from "react";
import type { ClimateRecord } from "@/components/ClimateChart";
import type { ClimatePoint, ContextLineLayer, ContextRasterLayer } from "@/components/ContextLayers";
import type { ContextFeature } from "@/lib/contextGeometry";
import { boundsContain, lonLatToMercator } from "@/lib/geo";
import { spansOverlap, type YearRange } from "@/lib/timeline";
import type { AtlasMetadata } from "@/lib/types";

const VECTOR_FILES: Record<string, string> = {
  rivers: "rivers.geojson",
  lakes: "lakes.geojson",
  "paleo-water": "paleo.geojson",
  roads: "roads.geojson",
};
const NIGHT_LINE_COLORS: Record<string, string> = { rivers: "#8ec8d8", lakes: "#8ec8d8", "paleo-water": "#e2b07a", roads: "#f0d7a4" };
const DAY_LINE_COLORS: Record<string, string> = { rivers: "#1d6278", lakes: "#1d6278", "paleo-water": "#8a5a22", roads: "#6a4318" };

export interface ContextLayersState {
  contextOn: Record<string, boolean>;
  setContext: (id: string, enabled: boolean) => void;
  contextOpacity: number;
  setContextOpacity: (value: number) => void;
  climateRecords: ClimateRecord[];
  roadsInPeriod: boolean;
  contextLines: ContextLineLayer[];
  contextRasters: ContextRasterLayer[];
  climatePoints: ClimatePoint[];
}

/** Rivers, lakes, roads, soil drapes and palaeoclimate records: which are on, and their fetched data. */
export function useContextLayers(range: YearRange, night: boolean, bounds: AtlasMetadata["bounds"] | null): ContextLayersState {
  const [contextOn, setContextOn] = useState<Record<string, boolean>>({
    rivers: false,
    lakes: false,
    "paleo-water": false,
    roads: false,
    clay: false,
    soc: false,
    climate: false,
  });
  const [contextOpacity, setContextOpacity] = useState(0.62);
  const [vectorCache, setVectorCache] = useState<Record<string, ContextFeature[]>>({});
  const [climateRecords, setClimateRecords] = useState<ClimateRecord[]>([]);

  useEffect(() => {
    let cancel = false;
    for (const [id, file] of Object.entries(VECTOR_FILES)) {
      if (!contextOn[id] || vectorCache[id]) continue;
      fetch(`/context/${file}`).then((response) => response.json()).then((data: { features: ContextFeature[] }) => {
        if (!cancel) setVectorCache((current) => ({ ...current, [id]: data.features }));
      }).catch(() => undefined);
    }
    if (contextOn.climate && climateRecords.length === 0) {
      fetch("/context/climate.json").then((response) => response.json()).then((data: { records: ClimateRecord[] }) => {
        if (!cancel) setClimateRecords(data.records);
      }).catch(() => undefined);
    }
    return () => {
      cancel = true;
    };
  }, [contextOn, vectorCache, climateRecords.length]);

  const setContext = useCallback((id: string, enabled: boolean) => {
    setContextOn((current) => ({ ...current, [id]: enabled }));
  }, []);
  const roadsInPeriod = spansOverlap(-300, 700, range);
  const lineColor = night ? NIGHT_LINE_COLORS : DAY_LINE_COLORS;
  const contextLines: ContextLineLayer[] = ["rivers", "lakes", "paleo-water", "roads"]
    .filter((id) => contextOn[id] && vectorCache[id] && (id !== "roads" || roadsInPeriod))
    .map((id) => ({ id, color: lineColor[id], features: vectorCache[id] }));
  const contextRasters: ContextRasterLayer[] = ["clay", "soc"]
    .filter((id) => contextOn[id])
    .map((id) => ({ id, url: `/context/${id}.png`, opacity: contextOpacity }));
  const climatePoints = contextOn.climate && bounds ? climatePointsWithin(climateRecords, bounds) : [];

  return {
    contextOn, setContext, contextOpacity, setContextOpacity, climateRecords,
    roadsInPeriod, contextLines, contextRasters, climatePoints,
  };
}

function climatePointsWithin(records: ClimateRecord[], bounds: AtlasMetadata["bounds"]): ClimatePoint[] {
  return records.filter((record) => {
    const [east, north] = lonLatToMercator(record.longitude, record.latitude);
    return boundsContain(bounds, east, north);
  }).map((record) => ({
    id: record.id,
    name: record.name,
    longitude: record.longitude,
    latitude: record.latitude,
  }));
}
