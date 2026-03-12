import { create } from "zustand";

export type FuelType = "E10" | "SP98" | "Gazole" | "E85" | "GPLc" | "SP95";

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
  isLoading: false,
  userLocation: null,
  selectedFuel: "E10",
  selectedDepartment: "44",
  lastUpdate: null,
  searchQuery: "",
  selectedStation: null,
  flyToStation: null,
  listSortBy: "price",

  setStations: (stations) => set({ stations }),
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
