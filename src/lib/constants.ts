export const FUEL_TYPES = [
  { type: "Gazole", color: "yellow" },
  { type: "E10", color: "green" },
  { type: "SP95", color: "emerald" },
  { type: "SP98", color: "emerald" },
  { type: "E85", color: "sky" },
  { type: "GPLc", color: "slate" },
] as const;

export type FuelTypeConfig = (typeof FUEL_TYPES)[number];
export type FuelType = FuelTypeConfig["type"];
export type FuelColor = FuelTypeConfig["color"];

export const DRAWER_SNAP_POINTS = {
  MINIMIZED: 0.16,
  MEDIUM: 0.42,
  EXPANDED: 0.82,
} as const;

export const DRAWER_SNAP_POINTS_ARRAY = Object.values(DRAWER_SNAP_POINTS);

export const RADIUS_OPTIONS = [
  { label: "5 km", value: 5 },
  { label: "10 km", value: 10 },
  { label: "20 km", value: 20 },
  { label: "50 km", value: 50 },
  { label: "100 km", value: 100 },
] as const;

export type SearchRadius = (typeof RADIUS_OPTIONS)[number]["value"];

export const DEFAULT_SEARCH_RADIUS: SearchRadius = 20;
