export interface WikiProperties {
  name: string;
  qid: string;
  source: string;
  sourceUrl: string;
  wikipedia: string | null;
  types: string[];
  periodLabels: string[];
  periods: string[];
  startYear: number | null;
  endYear: number | null;
  heritage: string[];
  confidence: "high" | "medium" | "low";
  licence: string;
}

export interface WikiFeature {
  type: "Feature";
  id: string;
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: WikiProperties;
}

export const PERIOD_SPAN: Record<string, [number, number]> = {
  neolithic: [-9600, -6000],
  bronze: [-3200, -330],
  classical: [-330, 1095],
  crusader: [1096, 1522],
};

export const PERIOD_COLOR: Record<string, string> = {
  neolithic: "#d06a3a",
  bronze: "#c4923a",
  classical: "#6d5b8a",
  crusader: "#2c6d8a",
};

export function wikiInPeriod(feature: WikiFeature, periodId: string): boolean {
  if (periodId === "all") return true;
  return feature.properties.periods.includes(periodId);
}
