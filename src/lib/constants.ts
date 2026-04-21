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
  DEFAULT: 0.42,
  EXPANDED: 0.82,
} as const;

export const DRAWER_SNAP_POINTS_ARRAY = Object.values(DRAWER_SNAP_POINTS);

export const RADIUS_OPTIONS = [
  { label: "5 km", value: 5 },
  { label: "10 km", value: 10 },
  { label: "20 km", value: 20 },
  { label: "50 km", value: 50 },
] as const;

export type SearchRadius = (typeof RADIUS_OPTIONS)[number]["value"];

export const DEFAULT_SEARCH_RADIUS: SearchRadius = 20;

export type VehicleType =
  | "citadine"
  | "berline"
  | "berline_exec"
  | "suv_compact"
  | "suv"
  | "grand_suv"
  | "monospace"
  | "utilitaire"
  | "hybride"
  | "phev";

export type VehiclePreset = {
  type: VehicleType;
  label: string;
  examples: string;
  icon: string;
  tankCapacity: number;
  consumption: number;
};

export const FILL_HABIT_OPTIONS = [
  { value: 0.25, label: "Dès ¼ consommé" },
  { value: 0.5, label: "À moitié" },
  { value: 0.75, label: "¼ restant" },
  { value: 0.9, label: "À la réserve" },
  { value: 1.0, label: "Plein complet" },
] as const;

export type FillHabit = (typeof FILL_HABIT_OPTIONS)[number]["value"];

export const HF_DATASET_BASE =
  "https://huggingface.co/datasets/baptistelechat/fais-ton-plein_dataset/resolve/main/data";
export const HF_LATEST_BASE_URL = `${HF_DATASET_BASE}/latest`;
export const HF_ROLLING_BASE_URL = `${HF_DATASET_BASE}/rolling/30days`;

export const DEPT_CACHE_DB_NAME = "faistonplein-cache";
export const DEPT_CACHE_STORE_NAME = "dept-parquet";
export const DEPT_CACHE_DB_VERSION = 1;
export const CACHE_MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2h — aligné sur la fréquence de mise à jour HuggingFace

export const VEHICLE_PRESETS: VehiclePreset[] = [
  {
    type: "citadine",
    label: "Citadine",
    examples: "Clio, 208, Yaris, Sandero",
    icon: "Car",
    tankCapacity: 45,
    consumption: 5.5,
  },
  {
    type: "berline",
    label: "Berline / Break",
    examples: "Golf, Mégane, 308, Focus",
    icon: "Car",
    tankCapacity: 50,
    consumption: 6.5,
  },
  {
    type: "berline_exec",
    label: "Grande berline",
    examples: "508, Passat, Série 3, Classe C",
    icon: "Car",
    tankCapacity: 60,
    consumption: 7.0,
  },
  {
    type: "suv_compact",
    label: "SUV compact",
    examples: "Captur, 2008, T-Roc, Puma",
    icon: "CarFront",
    tankCapacity: 45,
    consumption: 6.5,
  },
  {
    type: "suv",
    label: "SUV",
    examples: "Tiguan, 3008, Kadjar, Tucson",
    icon: "CarFront",
    tankCapacity: 55,
    consumption: 7.5,
  },
  {
    type: "grand_suv",
    label: "4x4 / Grand SUV",
    examples: "Kodiaq, 5008, Discovery, X5",
    icon: "CarFront",
    tankCapacity: 65,
    consumption: 9.0,
  },
  {
    type: "monospace",
    label: "Monospace",
    examples: "Scenic, Touran, Espace, Zafira",
    icon: "Bus",
    tankCapacity: 60,
    consumption: 7.0,
  },
  {
    type: "utilitaire",
    label: "Utilitaire",
    examples: "Kangoo, Berlingo, Partner, Transit",
    icon: "Van",
    tankCapacity: 50,
    consumption: 7.5,
  },
  {
    type: "hybride",
    label: "Hybride",
    examples: "Yaris HEV, Captur E-Tech, Niro HEV",
    icon: "Zap",
    tankCapacity: 40,
    consumption: 4.5,
  },
  {
    type: "phev",
    label: "Hybride rechargeable",
    examples: "3008 PHEV, Captur PHEV, Outlander",
    icon: "Plug",
    tankCapacity: 40,
    consumption: 5.0,
  },
];
