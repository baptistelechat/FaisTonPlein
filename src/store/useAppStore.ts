import {
  DEFAULT_SEARCH_RADIUS,
  FILL_HABIT_OPTIONS,
  FillHabit,
  FUEL_TYPES,
  FuelType,
  RADIUS_OPTIONS,
  VEHICLE_PRESETS,
  VehicleType,
} from "@/lib/constants";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { recomputeBest, recomputeRealCost } from "./storeHelpers";
import type { AppStore, FuelPrice, FuelStats, Station } from "./types";

// Re-export types for backward compatibility with existing imports
export type { AppStore, FuelPrice, FuelStats, Station };

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
      bestRealCostStationIds: [],
      resolvedNames: {},
      searchRadius: DEFAULT_SEARCH_RADIUS,
      showHighwayStations: true,
      showRoute: true,
      setShowRoute: (showRoute) => set({ showRoute }),
      showRuptureStations: true,
      setShowRuptureStations: (showRuptureStations) =>
        set({ showRuptureStations }),
      fitToListSignal: 0,

      flyToLocation: null,
      setFlyToLocation: (loc) => set({ flyToLocation: loc }),

      searchLocation: null,
      setSearchLocation: (searchLocation) =>
        set((state) => ({
          searchLocation,
          selectedStation: null,
          ...recomputeBest({ ...state, searchLocation }),
        })),

      setStations: (stations) =>
        set((state) => {
          const updatedSelectedStation = state.selectedStation
            ? (stations.find((s) => s.id === state.selectedStation!.id) ?? null)
            : null;
          return {
            stations,
            selectedStation: updatedSelectedStation,
            ...recomputeBest({ ...state, stations }),
          };
        }),

      setIsLoading: (isLoading) => set({ isLoading }),

      setUserLocation: (userLocation) =>
        set((state) => ({
          userLocation,
          ...recomputeBest({ ...state, userLocation }),
        })),

      setSelectedFuel: (selectedFuel) =>
        set((state) => {
          const stationHasFuel =
            (state.selectedStation?.prices.some(
              (p) => p.fuel_type === selectedFuel,
            ) ||
              state.selectedStation?.ruptureFuels.includes(
                selectedFuel as FuelType,
              )) ??
            true;
          return {
            selectedFuel,
            selectedStation: stationHasFuel ? state.selectedStation : null,
            fitToListSignal: stationHasFuel
              ? state.fitToListSignal
              : state.fitToListSignal + 1,
            ...recomputeBest({ ...state, selectedFuel }),
          };
        }),

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

      setSearchRadius: (searchRadius) =>
        set((state) => ({
          searchRadius,
          ...recomputeBest({ ...state, searchRadius }),
        })),

      setShowHighwayStations: (showHighwayStations) =>
        set((state) => ({
          showHighwayStations,
          ...recomputeBest({ ...state, showHighwayStations }),
        })),

      triggerFitToList: () =>
        set((state) => ({ fitToListSignal: state.fitToListSignal + 1 })),

      distanceMode: "road",
      roadDistances: {},
      roadDurations: {},
      isLoadingRoadDistances: false,
      isodistanceGeometry: null,
      setDistanceMode: (distanceMode) => set({ distanceMode }),

      setRoadDistances: (roadDistances) =>
        set((state) => ({
          roadDistances,
          ...recomputeBest({ ...state, roadDistances }),
        })),

      setRoadDurations: (roadDurations) => set({ roadDurations }),
      setIsLoadingRoadDistances: (isLoadingRoadDistances) =>
        set({ isLoadingRoadDistances }),
      setIsodistanceGeometry: (isodistanceGeometry) =>
        set({ isodistanceGeometry }),

      isApiAdresseUnavailable: false,
      setIsApiAdresseUnavailable: (isApiAdresseUnavailable) =>
        set({ isApiAdresseUnavailable }),

      priceTrends: {},
      setPriceTrends: (priceTrends) => set({ priceTrends }),
      arePriceTrendsLoading: false,
      setArePriceTrendsLoading: (arePriceTrendsLoading) =>
        set({ arePriceTrendsLoading }),

      nationalStationsCount: null,
      setNationalStationsCount: (nationalStationsCount) =>
        set({ nationalStationsCount }),

      nationalFranceAreaKm2: null,
      setNationalFranceAreaKm2: (nationalFranceAreaKm2) =>
        set({ nationalFranceAreaKm2 }),

      vehicleType: null,
      tankCapacity: 0,
      consumption: 0,
      fillHabit: 1.0,

      setVehicleType: (type) => {
        if (type === null) {
          const currentSort = get().listSortBy;
          set({
            vehicleType: null,
            tankCapacity: 0,
            consumption: 0,
            listSortBy: currentSort === "real-cost" ? "distance" : currentSort,
            bestRealCostStationIds: [],
          });
          return;
        }
        const preset = VEHICLE_PRESETS.find((p) => p.type === type);
        if (!preset) return;
        set((state) => ({
          vehicleType: type,
          tankCapacity: preset.tankCapacity,
          consumption: preset.consumption,
          ...recomputeBest({
            ...state,
            tankCapacity: preset.tankCapacity,
            consumption: preset.consumption,
          }),
        }));
      },

      setTankCapacity: (tankCapacity) =>
        set((state) => ({
          tankCapacity,
          ...recomputeRealCost({ ...state, tankCapacity }),
        })),

      setConsumption: (consumption) =>
        set((state) => ({
          consumption,
          ...recomputeRealCost({ ...state, consumption }),
        })),

      setFillHabit: (fillHabit) =>
        set((state) => ({
          fillHabit,
          ...recomputeRealCost({ ...state, fillHabit }),
        })),
    }),
    {
      name: "faistonplein-preferences",
      partialize: (state) => ({
        selectedFuel: state.selectedFuel,
        searchRadius: state.searchRadius,
        showHighwayStations: state.showHighwayStations,
        showRoute: state.showRoute,
        showRuptureStations: state.showRuptureStations,
        vehicleType: state.vehicleType,
        tankCapacity: state.tankCapacity,
        consumption: state.consumption,
        fillHabit: state.fillHabit,
        listSortBy: state.listSortBy,
        distanceMode: state.distanceMode,
      }),
      merge: (persistedState, currentState) => {
        const ps = persistedState as Partial<AppStore>;
        const selectedFuel =
          ps.selectedFuel && VALID_FUEL_TYPES.includes(ps.selectedFuel)
            ? ps.selectedFuel
            : "Gazole";
        const vehicleOk =
          typeof ps.consumption === "number" &&
          ps.consumption > 0 &&
          typeof ps.tankCapacity === "number" &&
          ps.tankCapacity > 0;
        const restoredSort =
          ps.listSortBy === "real-cost" && !vehicleOk
            ? "distance"
            : (ps.listSortBy ?? "distance");
        return {
          ...currentState,
          selectedFuel,
          searchRadius:
            ps.searchRadius &&
            RADIUS_OPTIONS.some((o) => o.value === ps.searchRadius)
              ? ps.searchRadius
              : DEFAULT_SEARCH_RADIUS,
          showHighwayStations: ps.showHighwayStations ?? true,
          showRoute: ps.showRoute ?? true,
          showRuptureStations: ps.showRuptureStations ?? true,
          vehicleType: ps.vehicleType ?? null,
          tankCapacity:
            typeof ps.tankCapacity === "number" && ps.tankCapacity >= 0
              ? ps.tankCapacity
              : 0,
          consumption:
            typeof ps.consumption === "number" && ps.consumption >= 0
              ? ps.consumption
              : 0,
          fillHabit: FILL_HABIT_OPTIONS.some((o) => o.value === ps.fillHabit)
            ? (ps.fillHabit as FillHabit)
            : 1.0,
          listSortBy: restoredSort,
          distanceMode: ps.distanceMode === "crow-fly" ? "crow-fly" : "road",
        };
      },
    },
  ),
);
