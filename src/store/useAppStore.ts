import { FUEL_TYPES, FuelType } from "@/lib/constants";
import { calculateDistance, getBestStationsForFuel } from "@/lib/utils";
import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  isLoading: boolean;
  userLocation: [number, number] | null;
  selectedFuel: FuelType;
  selectedDepartment: string;
  lastUpdate: string | null;
  searchQuery: string;
  selectedStation: Station | null;
  flyToStation: Station | null;
  listSortBy: "price" | "distance";
  bestPriceStationIds: string[];
  bestDistanceStationIds: string[];
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

// Mirrors the filtering logic of useFilteredStations
function getFilteredStations(
  stations: Station[],
  selectedFuel: string,
  showHighwayStations: boolean,
  searchRadius: number,
  referenceLocation: [number, number] | null,
): Station[] {
  return stations.filter((station) => {
    if (!station.prices.some((p) => p.fuel_type === selectedFuel)) return false;
    if (!showHighwayStations && station.isHighway) return false;
    if (searchRadius > 0 && referenceLocation !== null) {
      const dist = calculateDistance(
        referenceLocation[1],
        referenceLocation[0],
        station.lat,
        station.lon,
      );
      if (dist > searchRadius) return false;
    }
    return true;
  });
}

const VALID_FUEL_TYPES = FUEL_TYPES.map((f) => f.type) as string[];

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      stations: [],
      isLoading: false,
      userLocation: null,
      selectedFuel: "Gazole",
      selectedDepartment: "",
      lastUpdate: null,
      searchQuery: "",
      selectedStation: null,
      flyToStation: null,
      listSortBy: "distance",
      bestPriceStationIds: [],
      bestDistanceStationIds: [],
      resolvedNames: {},
      searchRadius: 20,
      showHighwayStations: true,
      fitToListSignal: 0,

      flyToLocation: null,
      setFlyToLocation: (loc) => set({ flyToLocation: loc }),

      searchLocation: null,
      setSearchLocation: (searchLocation) => {
        const { stations, selectedFuel, userLocation, showHighwayStations, searchRadius } = get();
        const referenceLocation = searchLocation || userLocation;
        const filtered = getFilteredStations(stations, selectedFuel, showHighwayStations, searchRadius, referenceLocation);
        const { bestPriceStationIds, bestDistanceStationIds } =
          getBestStationsForFuel({
            stations: filtered,
            selectedFuel,
            referenceLocation,
          });
        set({
          searchLocation,
          bestPriceStationIds,
          bestDistanceStationIds,
        });
      },

      setStations: (stations) => {
        const { selectedFuel, userLocation, searchLocation, showHighwayStations, searchRadius } = get();
        const referenceLocation = searchLocation || userLocation;
        const filtered = getFilteredStations(stations, selectedFuel, showHighwayStations, searchRadius, referenceLocation);
        const { bestPriceStationIds, bestDistanceStationIds } =
          getBestStationsForFuel({
            stations: filtered,
            selectedFuel,
            referenceLocation,
          });

        set({
          stations,
          bestPriceStationIds,
          bestDistanceStationIds,
        });
      },
      setIsLoading: (isLoading) => set({ isLoading }),
      setUserLocation: (userLocation) => {
        const { stations, selectedFuel, searchLocation, showHighwayStations, searchRadius } = get();
        const referenceLocation = searchLocation || userLocation;
        const filtered = getFilteredStations(stations, selectedFuel, showHighwayStations, searchRadius, referenceLocation);
        const { bestPriceStationIds, bestDistanceStationIds } =
          getBestStationsForFuel({
            stations: filtered,
            selectedFuel,
            referenceLocation,
          });
        set({
          userLocation,
          bestPriceStationIds,
          bestDistanceStationIds,
        });
      },
      setSelectedFuel: (selectedFuel) => {
        const { stations, userLocation, searchLocation, showHighwayStations, searchRadius } = get();
        const referenceLocation = searchLocation || userLocation;
        const filtered = getFilteredStations(stations, selectedFuel, showHighwayStations, searchRadius, referenceLocation);
        const { bestPriceStationIds, bestDistanceStationIds } =
          getBestStationsForFuel({
            stations: filtered,
            selectedFuel,
            referenceLocation,
          });
        set({
          selectedFuel,
          bestPriceStationIds,
          bestDistanceStationIds,
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
      setSearchRadius: (searchRadius) => {
        const { stations, selectedFuel, userLocation, searchLocation, showHighwayStations } = get();
        const referenceLocation = searchLocation || userLocation;
        const filtered = getFilteredStations(stations, selectedFuel, showHighwayStations, searchRadius, referenceLocation);
        const { bestPriceStationIds, bestDistanceStationIds } = getBestStationsForFuel({
          stations: filtered,
          selectedFuel,
          referenceLocation,
        });
        set({ searchRadius, bestPriceStationIds, bestDistanceStationIds });
      },
      setShowHighwayStations: (showHighwayStations) => {
        const { stations, selectedFuel, userLocation, searchLocation, searchRadius } = get();
        const referenceLocation = searchLocation || userLocation;
        const filtered = getFilteredStations(stations, selectedFuel, showHighwayStations, searchRadius, referenceLocation);
        const { bestPriceStationIds, bestDistanceStationIds } = getBestStationsForFuel({
          stations: filtered,
          selectedFuel,
          referenceLocation,
        });
        set({ showHighwayStations, bestPriceStationIds, bestDistanceStationIds });
      },
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
          searchRadius: ps.searchRadius && [5, 10, 20, 50, 100].includes(ps.searchRadius) ? ps.searchRadius : 20,
          showHighwayStations: ps.showHighwayStations ?? true,
        };
      },
    },
  ),
);
