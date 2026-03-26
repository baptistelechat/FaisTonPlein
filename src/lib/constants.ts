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
  MINIMIZED: 0.14,
  MEDIUM: 0.4,
  EXPANDED: 0.82,
} as const;

export const DRAWER_SNAP_POINTS_ARRAY = Object.values(DRAWER_SNAP_POINTS);
