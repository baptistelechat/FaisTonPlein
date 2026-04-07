import { DEFAULT_SEARCH_RADIUS, FILL_HABIT_OPTIONS, FillHabit, FUEL_TYPES, FuelType, RADIUS_OPTIONS, VEHICLE_PRESETS, VehicleType } from '@/lib/constants';
import { TrendDirection } from '@/lib/priceTrends';
import type { Geometry } from 'geojson';
import { filterStationsByLocation, getBestRealCostStation, getBestStationsForFuel } from '@/lib/utils';
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
  listSortBy: "price" | "distance" | "real-cost";
  bestPriceStationIds: string[];
  bestDistanceStationIds: string[];
  bestRealCostStationIds: string[];
  resolvedNames: Record<string, string>;
  searchRadius: number;
  showHighwayStations: boolean;
  showRoute: boolean;
  setShowRoute: (show: boolean) => void;

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

  distanceMode: 'road' | 'crow-fly';
  roadDistances: Record<string, number>;
  roadDurations: Record<string, number>;
  isLoadingRoadDistances: boolean;
  isodistanceGeometry: Geometry | null;
  setDistanceMode: (mode: 'road' | 'crow-fly') => void;
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

  analystMode: boolean;
  setAnalystMode: (enabled: boolean) => void;

  nationalStationsCount: number | null;
  setNationalStationsCount: (count: number) => void;

};

function getFilteredStations(
  stations: Station[],
  selectedFuel: string,
  showHighwayStations: boolean,
  searchRadius: number,
  referenceLocation: [number, number] | null,
): Station[] {
  const byLocation = filterStationsByLocation(stations, {
    showHighwayStations,
    searchRadius,
    referenceLocation,
  });
  return byLocation.filter((s) => s.prices.some((p) => p.fuel_type === selectedFuel));
}

const VALID_FUEL_TYPES = FUEL_TYPES.map((f) => f.type) as string[];

function computeBestStations(
  stations: Station[],
  selectedFuel: string,
  showHighwayStations: boolean,
  searchRadius: number,
  referenceLocation: [number, number] | null,
  consumption: number,
  tankCapacity: number,
  fillHabit: number,
  roadDistances: Record<string, number>,
) {
  const filtered = getFilteredStations(stations, selectedFuel, showHighwayStations, searchRadius, referenceLocation)
  const { bestPriceStationIds, bestDistanceStationIds } = getBestStationsForFuel({
    stations: filtered,
    selectedFuel,
    referenceLocation,
    roadDistances,
  })
  const { bestRealCostStationIds } = getBestRealCostStation({
    stations: filtered,
    selectedFuel,
    referenceLocation,
    consumption,
    tankCapacity,
    fillHabit,
    roadDistances,
  })
  return { bestPriceStationIds, bestDistanceStationIds, bestRealCostStationIds }
}

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
      fitToListSignal: 0,

      flyToLocation: null,
      setFlyToLocation: (loc) => set({ flyToLocation: loc }),

      searchLocation: null,
      setSearchLocation: (searchLocation) => {
        const { stations, selectedFuel, userLocation, showHighwayStations, searchRadius, consumption, tankCapacity, fillHabit, roadDistances } = get();
        const referenceLocation = searchLocation || userLocation;
        const { bestPriceStationIds, bestDistanceStationIds, bestRealCostStationIds } = computeBestStations(
          stations, selectedFuel, showHighwayStations, searchRadius, referenceLocation, consumption, tankCapacity, fillHabit, roadDistances,
        )
        set({ searchLocation, bestPriceStationIds, bestDistanceStationIds, bestRealCostStationIds, selectedStation: null });
      },

      setStations: (stations) => {
        const { selectedFuel, userLocation, searchLocation, showHighwayStations, searchRadius, selectedStation, consumption, tankCapacity, fillHabit, roadDistances } = get();
        const referenceLocation = searchLocation || userLocation;
        const { bestPriceStationIds, bestDistanceStationIds, bestRealCostStationIds } = computeBestStations(
          stations, selectedFuel, showHighwayStations, searchRadius, referenceLocation, consumption, tankCapacity, fillHabit, roadDistances,
        )
        const updatedSelectedStation = selectedStation
          ? stations.find((s) => s.id === selectedStation.id) ?? null
          : null;
        set({ stations, bestPriceStationIds, bestDistanceStationIds, bestRealCostStationIds, selectedStation: updatedSelectedStation });
      },
      setIsLoading: (isLoading) => set({ isLoading }),
      setUserLocation: (userLocation) => {
        const { stations, selectedFuel, searchLocation, showHighwayStations, searchRadius, consumption, tankCapacity, fillHabit, roadDistances } = get();
        const referenceLocation = searchLocation || userLocation;
        const { bestPriceStationIds, bestDistanceStationIds, bestRealCostStationIds } = computeBestStations(
          stations, selectedFuel, showHighwayStations, searchRadius, referenceLocation, consumption, tankCapacity, fillHabit, roadDistances,
        )
        set({ userLocation, bestPriceStationIds, bestDistanceStationIds, bestRealCostStationIds });
      },
      setSelectedFuel: (selectedFuel) => {
        const { stations, userLocation, searchLocation, showHighwayStations, searchRadius, consumption, tankCapacity, fillHabit, roadDistances, selectedStation } = get();
        const referenceLocation = searchLocation || userLocation;
        const { bestPriceStationIds, bestDistanceStationIds, bestRealCostStationIds } = computeBestStations(
          stations, selectedFuel, showHighwayStations, searchRadius, referenceLocation, consumption, tankCapacity, fillHabit, roadDistances,
        )
        const stationHasFuel = selectedStation?.prices.some((p) => p.fuel_type === selectedFuel) ?? true;
        set((state) => ({
          selectedFuel,
          bestPriceStationIds,
          bestDistanceStationIds,
          bestRealCostStationIds,
          selectedStation: stationHasFuel ? selectedStation : null,
          fitToListSignal: stationHasFuel ? state.fitToListSignal : state.fitToListSignal + 1,
        }));
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
        const { stations, selectedFuel, userLocation, searchLocation, showHighwayStations, consumption, tankCapacity, fillHabit, roadDistances } = get();
        const referenceLocation = searchLocation || userLocation;
        const { bestPriceStationIds, bestDistanceStationIds, bestRealCostStationIds } = computeBestStations(
          stations, selectedFuel, showHighwayStations, searchRadius, referenceLocation, consumption, tankCapacity, fillHabit, roadDistances,
        )
        set({ searchRadius, bestPriceStationIds, bestDistanceStationIds, bestRealCostStationIds });
      },
      setShowHighwayStations: (showHighwayStations) => {
        const { stations, selectedFuel, userLocation, searchLocation, searchRadius, consumption, tankCapacity, fillHabit, roadDistances } = get();
        const referenceLocation = searchLocation || userLocation;
        const { bestPriceStationIds, bestDistanceStationIds, bestRealCostStationIds } = computeBestStations(
          stations, selectedFuel, showHighwayStations, searchRadius, referenceLocation, consumption, tankCapacity, fillHabit, roadDistances,
        )
        set({ showHighwayStations, bestPriceStationIds, bestDistanceStationIds, bestRealCostStationIds });
      },
      triggerFitToList: () =>
        set((state) => ({ fitToListSignal: state.fitToListSignal + 1 })),

      distanceMode: 'road',
      roadDistances: {},
      roadDurations: {},
      isLoadingRoadDistances: false,
      isodistanceGeometry: null,
      setDistanceMode: (distanceMode) => set({ distanceMode }),
      setRoadDistances: (roadDistances) => {
        const { stations, selectedFuel, userLocation, searchLocation, showHighwayStations, searchRadius, consumption, tankCapacity, fillHabit } = get();
        const referenceLocation = searchLocation || userLocation;
        const { bestPriceStationIds, bestDistanceStationIds, bestRealCostStationIds } = computeBestStations(
          stations, selectedFuel, showHighwayStations, searchRadius, referenceLocation, consumption, tankCapacity, fillHabit, roadDistances,
        )
        set({ roadDistances, bestPriceStationIds, bestDistanceStationIds, bestRealCostStationIds });
      },
      setRoadDurations: (roadDurations) => set({ roadDurations }),
      setIsLoadingRoadDistances: (isLoadingRoadDistances) => set({ isLoadingRoadDistances }),
      setIsodistanceGeometry: (isodistanceGeometry) => set({ isodistanceGeometry }),

      isApiAdresseUnavailable: false,
      setIsApiAdresseUnavailable: (isApiAdresseUnavailable) => set({ isApiAdresseUnavailable }),

      priceTrends: {},
      setPriceTrends: (priceTrends) => set({ priceTrends }),
      arePriceTrendsLoading: false,
      setArePriceTrendsLoading: (arePriceTrendsLoading) => set({ arePriceTrendsLoading }),

      analystMode: false,
      setAnalystMode: (analystMode) => set({ analystMode }),

      nationalStationsCount: null,
      setNationalStationsCount: (nationalStationsCount) => set({ nationalStationsCount }),

      vehicleType: null,
      tankCapacity: 0,
      consumption: 0,
      fillHabit: 1.0,
      setVehicleType: (type) => {
        if (type === null) {
          const currentSort = get().listSortBy
          set({
            vehicleType: null,
            tankCapacity: 0,
            consumption: 0,
            listSortBy: currentSort === 'real-cost' ? 'distance' : currentSort,
            bestRealCostStationIds: [],
          });
          return;
        }
        const preset = VEHICLE_PRESETS.find((p) => p.type === type);
        if (!preset) return;
        const { stations, selectedFuel, userLocation, searchLocation, showHighwayStations, searchRadius, fillHabit, roadDistances } = get()
        const referenceLocation = searchLocation || userLocation
        const { bestPriceStationIds, bestDistanceStationIds, bestRealCostStationIds } = computeBestStations(
          stations, selectedFuel, showHighwayStations, searchRadius, referenceLocation, preset.consumption, preset.tankCapacity, fillHabit, roadDistances,
        )
        set({ vehicleType: type, tankCapacity: preset.tankCapacity, consumption: preset.consumption, bestPriceStationIds, bestDistanceStationIds, bestRealCostStationIds });
      },
      setTankCapacity: (tankCapacity) => {
        const { stations, selectedFuel, userLocation, searchLocation, showHighwayStations, searchRadius, consumption, fillHabit, roadDistances } = get()
        const referenceLocation = searchLocation || userLocation
        const { bestRealCostStationIds } = getBestRealCostStation({
          stations: getFilteredStations(stations, selectedFuel, showHighwayStations, searchRadius, referenceLocation),
          selectedFuel,
          referenceLocation,
          consumption,
          tankCapacity,
          fillHabit,
          roadDistances,
        })
        set({ tankCapacity, bestRealCostStationIds })
      },
      setConsumption: (consumption) => {
        const { stations, selectedFuel, userLocation, searchLocation, showHighwayStations, searchRadius, tankCapacity, fillHabit, roadDistances } = get()
        const referenceLocation = searchLocation || userLocation
        const { bestRealCostStationIds } = getBestRealCostStation({
          stations: getFilteredStations(stations, selectedFuel, showHighwayStations, searchRadius, referenceLocation),
          selectedFuel,
          referenceLocation,
          consumption,
          tankCapacity,
          fillHabit,
          roadDistances,
        })
        set({ consumption, bestRealCostStationIds })
      },
      setFillHabit: (fillHabit) => {
        const { stations, selectedFuel, userLocation, searchLocation, showHighwayStations, searchRadius, tankCapacity, consumption, roadDistances } = get()
        const referenceLocation = searchLocation || userLocation
        const { bestRealCostStationIds } = getBestRealCostStation({
          stations: getFilteredStations(stations, selectedFuel, showHighwayStations, searchRadius, referenceLocation),
          selectedFuel,
          referenceLocation,
          consumption,
          tankCapacity,
          fillHabit,
          roadDistances,
        })
        set({ fillHabit, bestRealCostStationIds })
      },
    }),
    {
      name: "faistonplein-preferences",
      partialize: (state) => ({
        selectedFuel: state.selectedFuel,
        searchRadius: state.searchRadius,
        showHighwayStations: state.showHighwayStations,
        showRoute: state.showRoute,
        vehicleType: state.vehicleType,
        tankCapacity: state.tankCapacity,
        consumption: state.consumption,
        fillHabit: state.fillHabit,
        listSortBy: state.listSortBy,
        distanceMode: state.distanceMode,
        analystMode: state.analystMode,
      }),
      merge: (persistedState, currentState) => {
        const ps = persistedState as Partial<AppStore>;
        const selectedFuel =
          ps.selectedFuel && VALID_FUEL_TYPES.includes(ps.selectedFuel)
            ? ps.selectedFuel
            : "Gazole";
        const vehicleOk =
          typeof ps.consumption === 'number' && ps.consumption > 0 &&
          typeof ps.tankCapacity === 'number' && ps.tankCapacity > 0
        const restoredSort =
          ps.listSortBy === 'real-cost' && !vehicleOk ? 'distance' : (ps.listSortBy ?? 'distance')
        return {
          ...currentState,
          selectedFuel,
          searchRadius: ps.searchRadius && RADIUS_OPTIONS.some((o) => o.value === ps.searchRadius) ? ps.searchRadius : DEFAULT_SEARCH_RADIUS,
          showHighwayStations: ps.showHighwayStations ?? true,
          showRoute: ps.showRoute ?? true,
          vehicleType: ps.vehicleType ?? null,
          tankCapacity: typeof ps.tankCapacity === 'number' && ps.tankCapacity >= 0 ? ps.tankCapacity : 0,
          consumption: typeof ps.consumption === 'number' && ps.consumption >= 0 ? ps.consumption : 0,
          fillHabit: FILL_HABIT_OPTIONS.some((o) => o.value === ps.fillHabit) ? (ps.fillHabit as FillHabit) : 1.0,
          listSortBy: restoredSort,
          distanceMode: ps.distanceMode === 'crow-fly' ? 'crow-fly' : 'road',
          analystMode: ps.analystMode ?? false,
        };
      },
    },
  ),
);
