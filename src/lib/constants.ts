export const FUEL_TYPES = ["E10", "SP98", "Gazole", "E85", "GPLc", "SP95"] as const;

export type FuelType = typeof FUEL_TYPES[number];
