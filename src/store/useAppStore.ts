import { FUEL_TYPES, FuelType } from "@/lib/constants";
import { getBestStationsForFuel } from "@/lib/utils";
import { create } from "zustand";
import { persist } from "zustand/middleware";

const quantileSorted = (sorted: number[], q: number) => {
  if (sorted.length === 0) return 0;
  const clampedQ = Math.min(1, Math.max(0, q));
  const pos = (sorted.length - 1) * clampedQ;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1];
  if (next === undefined) return sorted[base]!;
  return sorted[base]! + rest * (next - sorted[base]!);
};

const computeStdDev = (values: number[], mean: number) => {
  if (values.length === 0) return 0;
  let sumSq = 0;
  for (const v of values) {
    const d = v - mean;
    sumSq += d * d;
  }
  return Math.sqrt(sumSq / values.length);
};

export type FuelPrice = {
  fuel_type: FuelType;
  price: number;
  updated_at: string;
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

type AppStore = {
  stations: Station[];
  stats: Record<FuelType, FuelStats | null>;
  isLoading: boolean;
  userLocation: [number, number] | null;
  selectedFuel: FuelType;
  selectedDepartment: string;
  lastUpdate: string | null;
  searchQuery: string;
  selectedStation: Station | null;
  flyToStation: Station | null;
  listSortBy: "price" | "distance";
  bestPriceStationId: string | null;
  bestDistanceStationId: string | null;
  resolvedNames: Record<string, string>;
  searchRadius: number;
  showHighwayStations: boolean;

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
  setListSortBy: (sortBy: "price" | "distance") => void;
  setResolvedName: (stationId: string, name: string) => void;
  setSearchRadius: (radius: number) => void;
  setShowHighwayStations: (show: boolean) => void;
  fitToListSignal: number;
  triggerFitToList: () => void;
};

const VALID_FUEL_TYPES = FUEL_TYPES.map((f) => f.type) as string[];

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      stations: [],
      stats: FUEL_TYPES.reduce(
        (acc, fuel) => ({ ...acc, [fuel.type]: null }),
        {} as Record<FuelType, FuelStats | null>,
      ),
      isLoading: false,
      userLocation: null,
      selectedFuel: "Gazole",
      selectedDepartment: "",
      lastUpdate: null,
      searchQuery: "",
      selectedStation: null,
      flyToStation: null,
      listSortBy: "distance",
      bestPriceStationId: null,
      bestDistanceStationId: null,
      resolvedNames: {},
      searchRadius: 20,
      showHighwayStations: true,
      fitToListSignal: 0,

      flyToLocation: null,
      setFlyToLocation: (loc) => set({ flyToLocation: loc }),

      searchLocation: null,
      setSearchLocation: (searchLocation) => {
        const { stations, selectedFuel, userLocation } = get();
        const referenceLocation = searchLocation || userLocation;
        const { bestPriceStationId, bestDistanceStationId } =
          getBestStationsForFuel({
            stations,
            selectedFuel,
            referenceLocation,
          });
        set({
          searchLocation,
          bestPriceStationId,
          bestDistanceStationId,
        });
      },

      setStations: (stations) => {
        const stats = FUEL_TYPES.reduce(
          (acc, fuel) => {
            const prices: number[] = [];
            let sum = 0;

            for (const station of stations) {
              for (const p of station.prices) {
                if (p.fuel_type !== fuel.type) continue;
                prices.push(p.price);
                sum += p.price;
              }
            }

            if (prices.length > 0) {
              const sortedPrices = [...prices].sort((a, b) => a - b);
              const min = sortedPrices[0]!;
              const max = sortedPrices[sortedPrices.length - 1]!;
              const average = sum / prices.length;

              const median = quantileSorted(sortedPrices, 0.5);
              const p10 = quantileSorted(sortedPrices, 0.1);
              const p25 = quantileSorted(sortedPrices, 0.25);
              const p75 = quantileSorted(sortedPrices, 0.75);
              const p90 = quantileSorted(sortedPrices, 0.9);
              const iqr = p75 - p25;

              const stdDev = computeStdDev(prices, average);

              acc[fuel.type] = {
                min,
                max,
                average,
                median,
                p10,
                p25,
                p75,
                p90,
                iqr,
                stdDev,
                count: prices.length,
              };
            } else {
              acc[fuel.type] = null;
            }
            return acc;
          },
          {} as Record<FuelType, FuelStats | null>,
        );

        const { selectedFuel, userLocation, searchLocation } = get();
        const referenceLocation = searchLocation || userLocation;
        const { bestPriceStationId, bestDistanceStationId } =
          getBestStationsForFuel({
            stations,
            selectedFuel,
            referenceLocation,
          });

        set({
          stations,
          stats,
          bestPriceStationId,
          bestDistanceStationId,
        });
      },
      setIsLoading: (isLoading) => set({ isLoading }),
      setUserLocation: (userLocation) => {
        const { stations, selectedFuel, searchLocation } = get();
        const referenceLocation = searchLocation || userLocation;
        const { bestPriceStationId, bestDistanceStationId } =
          getBestStationsForFuel({
            stations,
            selectedFuel,
            referenceLocation,
          });
        set({
          userLocation,
          bestPriceStationId,
          bestDistanceStationId,
        });
      },
      setSelectedFuel: (selectedFuel) => {
        const { stations, userLocation, searchLocation } = get();
        const referenceLocation = searchLocation || userLocation;
        const { bestPriceStationId, bestDistanceStationId } =
          getBestStationsForFuel({
            stations,
            selectedFuel,
            referenceLocation,
          });
        set({
          selectedFuel,
          bestPriceStationId,
          bestDistanceStationId,
        });
      },
      setSelectedDepartment: (selectedDepartment) =>
        set({ selectedDepartment }),
      setLastUpdate: (lastUpdate) => set({ lastUpdate }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSelectedStation: (station) => set({ selectedStation: station }),
      setFlyToStation: (station) => set({ flyToStation: station }),
      setListSortBy: (sortBy) => set({ listSortBy: sortBy }),
      setResolvedName: (stationId, name) =>
        set((state) => ({
          resolvedNames: { ...state.resolvedNames, [stationId]: name },
        })),
      setSearchRadius: (searchRadius) => set({ searchRadius }),
      setShowHighwayStations: (showHighwayStations) =>
        set({ showHighwayStations }),
      triggerFitToList: () =>
        set((state) => ({ fitToListSignal: state.fitToListSignal + 1 })),
    }),
    {
      name: "faistonplein-preferences",
      partialize: (state) => ({
        selectedFuel: state.selectedFuel,
        searchRadius: state.searchRadius,
        showHighwayStations: state.showHighwayStations,
      }),
      merge: (persistedState, currentState) => {
        const ps = persistedState as Partial<AppStore>;
        const selectedFuel =
          ps.selectedFuel && VALID_FUEL_TYPES.includes(ps.selectedFuel)
            ? ps.selectedFuel
            : "Gazole";
        return {
          ...currentState,
          selectedFuel,
          searchRadius: ps.searchRadius && ps.searchRadius > 0 ? ps.searchRadius : 20,
          showHighwayStations: ps.showHighwayStations ?? true,
        };
      },
    },
  ),
);
