import type { FillHabit, FuelType, VehicleType } from "@/lib/constants";
import type { TrendDirection } from "@/lib/priceTrends";
import type { Geometry } from "geojson";

export type FuelPrice = {
  fuel_type: FuelType;
  price: number;
  updated_at: string | number | Date;
};

export type Station = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  services: string[];
  address: string;
  prices: FuelPrice[];
  is24h: boolean;
  isHighway: boolean;
  ruptureFuels: FuelType[];
};

export type FuelStats = {
  min: number;
  max: number;
  average: number;
  median: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
  iqr: number;
  stdDev: number;
  count: number;
};

export type AppStore = {
  stations: Station[];
  isLoading: boolean;
  userLocation: [number, number] | null;
  selectedFuel: FuelType;
  selectedDepartment: string;
  lastUpdate: string | null;
  searchQuery: string;
  selectedStation: Station | null;
  flyToStation: Station | null;
  listSortBy: "price" | "distance" | "real-cost";
  bestPriceStationIds: string[];
  bestDistanceStationIds: string[];
  bestRealCostStationIds: string[];
  resolvedNames: Record<string, string>;
  searchRadius: number;
  showHighwayStations: boolean;
  showRoute: boolean;
  setShowRoute: (show: boolean) => void;
  showRuptureStations: boolean;
  setShowRuptureStations: (show: boolean) => void;

  flyToLocation: [number, number] | null;
  setFlyToLocation: (loc: [number, number] | null) => void;

  searchLocation: [number, number] | null;
  setSearchLocation: (loc: [number, number] | null) => void;

  setStations: (stations: Station[]) => void;
  setIsLoading: (loading: boolean) => void;
  setUserLocation: (loc: [number, number] | null) => void;
  setSelectedFuel: (fuel: FuelType) => void;
  setSelectedDepartment: (dept: string) => void;
  setLastUpdate: (date: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedStation: (station: Station | null) => void;
  setFlyToStation: (station: Station | null) => void;
  setListSortBy: (sortBy: "price" | "distance" | "real-cost") => void;
  setResolvedName: (stationId: string, name: string) => void;
  setSearchRadius: (radius: number) => void;
  setShowHighwayStations: (show: boolean) => void;
  fitToListSignal: number;
  triggerFitToList: () => void;

  vehicleType: VehicleType | null;
  tankCapacity: number;
  consumption: number;
  fillHabit: FillHabit;
  setVehicleType: (type: VehicleType | null) => void;
  setTankCapacity: (capacity: number) => void;
  setConsumption: (consumption: number) => void;
  setFillHabit: (habit: FillHabit) => void;

  distanceMode: "road" | "crow-fly";
  roadDistances: Record<string, number>;
  roadDurations: Record<string, number>;
  isLoadingRoadDistances: boolean;
  isodistanceGeometry: Geometry | null;
  setDistanceMode: (mode: "road" | "crow-fly") => void;
  setRoadDistances: (distances: Record<string, number>) => void;
  setRoadDurations: (durations: Record<string, number>) => void;
  setIsLoadingRoadDistances: (loading: boolean) => void;
  setIsodistanceGeometry: (geometry: Geometry | null) => void;

  isApiAdresseUnavailable: boolean;
  setIsApiAdresseUnavailable: (v: boolean) => void;

  priceTrends: Record<string, TrendDirection>;
  setPriceTrends: (trends: Record<string, TrendDirection>) => void;
  arePriceTrendsLoading: boolean;
  setArePriceTrendsLoading: (loading: boolean) => void;

  nationalStationsCount: number | null;
  setNationalStationsCount: (count: number) => void;

  nationalFranceAreaKm2: number | null;
  setNationalFranceAreaKm2: (area: number) => void;

  cachedDepts: Record<string, { cachedAt: number; size: number }>;
  cachedRollingDepts: Record<string, { cachedAt: number; size: number }>;
  loadedDepts: string[];
  downloadingDepts: string[];
  progressByDept: Record<string, number>;
  setCachedDeptMeta: (
    dept: string,
    meta: { cachedAt: number; size: number } | null,
  ) => void;
  setCachedRollingDeptMeta: (
    dept: string,
    meta: { cachedAt: number; size: number } | null,
  ) => void;
  clearAllCachedDepts: () => void;
  setLoadedDepts: (depts: string[]) => void;
  setDownloadingDept: (dept: string, progress: number | null) => void;
};
