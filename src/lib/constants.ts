export const FUEL_TYPES = ["E10", "SP98", "Gazole", "E85", "GPLc", "SP95"] as const;

export type FuelType = typeof FUEL_TYPES[number];

export const DRAWER_SNAP_POINTS = {
  MINIMIZED: 0.14,
  MEDIUM: 0.40,
  EXPANDED: 0.82,
} as const;

export const DRAWER_SNAP_POINTS_ARRAY = Object.values(DRAWER_SNAP_POINTS);
