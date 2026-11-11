import type { PeriodChip, SiteFeature } from "./types";

export const PERIODS: PeriodChip[] = [
  { id: "all", label: "All periods", start: -12000, end: 2100 },
  { id: "neolithic", label: "Neolithic", start: -9600, end: -6000 },
  { id: "bronze", label: "Bronze & Iron", start: -3200, end: -330 },
  { id: "classical", label: "Classical & Byzantine", start: -330, end: 1095 },
  { id: "crusader", label: "Crusader era", start: 1096, end: 1522 },
];

export const LAYER_STYLE = {
  neolithic: { title: "Neolithic", color: "#d06a3a" },
  bronze: { title: "Bronze & Iron", color: "#c4923a" },
  classical: { title: "Classical & Byzantine", color: "#6d5b8a" },
  crusader: { title: "Crusader era", color: "#2c6d8a" },
} as const;

export function periodOverlaps(site: SiteFeature, period: PeriodChip): boolean {
  if (period.id === "all") {
    return true;
  }
  return site.properties.endYear >= period.start && site.properties.startYear <= period.end;
}

export function formatYear(year: number): string {
  if (year < 0) {
    return `${Math.abs(year)} BCE`;
  }
  return `${year} CE`;
}
