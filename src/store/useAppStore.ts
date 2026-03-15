import { FuelType, FUEL_TYPES } from "@/lib/constants";
import { create } from "zustand";

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
};

export type FuelStats = {
  min: number;
  max: number;
  average: number;
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
};

export const useAppStore = create<AppStore>((set) => ({
  stations: [],
  stats: FUEL_TYPES.reduce(
    (acc, fuel) => ({ ...acc, [fuel]: null }),
    {} as Record<FuelType, FuelStats | null>,
  ),
  isLoading: false,
  userLocation: null,
  selectedFuel: "E10",
  selectedDepartment: "",
  lastUpdate: null,
  searchQuery: "",
  selectedStation: null,
  flyToStation: null,
  listSortBy: "price",

  flyToLocation: null,
  setFlyToLocation: (loc) => set({ flyToLocation: loc }),

  searchLocation: null,
  setSearchLocation: (loc) => set({ searchLocation: loc }),

  setStations: (stations) => {
    const stats = FUEL_TYPES.reduce(
      (acc, fuel) => {
        const prices = stations
          .flatMap((s) => s.prices)
          .filter((p) => p.fuel_type === fuel)
          .map((p) => p.price);

        if (prices.length > 0) {
          const min = Math.min(...prices);
          const max = Math.max(...prices);
          const average =
            prices.reduce((sum, p) => sum + p, 0) / prices.length;
          acc[fuel] = { min, max, average, count: prices.length };
        } else {
          acc[fuel] = null;
        }
        return acc;
      },
      {} as Record<FuelType, FuelStats | null>,
    );

    set({ stations, stats });
  },
  setIsLoading: (isLoading) => set({ isLoading }),
  setUserLocation: (userLocation) => set({ userLocation }),
  setSelectedFuel: (selectedFuel) => set({ selectedFuel }),
  setSelectedDepartment: (selectedDepartment) => set({ selectedDepartment }),
  setLastUpdate: (lastUpdate) => set({ lastUpdate }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedStation: (station) => set({ selectedStation: station }),
  setFlyToStation: (station) => set({ flyToStation: station }),
  setListSortBy: (sortBy) => set({ listSortBy: sortBy }),
}));
