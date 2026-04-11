import {
  filterStationsByLocation,
  getBestRealCostStation,
  getBestStationsForFuel,
} from "@/lib/utils";
import type { Station } from "./types";

export function getFilteredStations(
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
  return byLocation.filter((s) =>
    s.prices.some((p) => p.fuel_type === selectedFuel),
  );
}

type BestComputeInput = {
  stations: Station[];
  selectedFuel: string;
  showHighwayStations: boolean;
  searchRadius: number;
  searchLocation: [number, number] | null;
  userLocation: [number, number] | null;
  consumption: number;
  tankCapacity: number;
  fillHabit: number;
  roadDistances: Record<string, number>;
};

export function recomputeBest(state: BestComputeInput) {
  const referenceLocation = state.searchLocation || state.userLocation;
  const filtered = getFilteredStations(
    state.stations,
    state.selectedFuel,
    state.showHighwayStations,
    state.searchRadius,
    referenceLocation,
  );
  const { bestPriceStationIds, bestDistanceStationIds } =
    getBestStationsForFuel({
      stations: filtered,
      selectedFuel: state.selectedFuel,
      referenceLocation,
      roadDistances: state.roadDistances,
    });
  const { bestRealCostStationIds } = getBestRealCostStation({
    stations: filtered,
    selectedFuel: state.selectedFuel,
    referenceLocation,
    consumption: state.consumption,
    tankCapacity: state.tankCapacity,
    fillHabit: state.fillHabit,
    roadDistances: state.roadDistances,
  });
  return {
    bestPriceStationIds,
    bestDistanceStationIds,
    bestRealCostStationIds,
  };
}

export function recomputeRealCost(state: BestComputeInput) {
  const referenceLocation = state.searchLocation || state.userLocation;
  const { bestRealCostStationIds } = getBestRealCostStation({
    stations: getFilteredStations(
      state.stations,
      state.selectedFuel,
      state.showHighwayStations,
      state.searchRadius,
      referenceLocation,
    ),
    selectedFuel: state.selectedFuel,
    referenceLocation,
    consumption: state.consumption,
    tankCapacity: state.tankCapacity,
    fillHabit: state.fillHabit,
    roadDistances: state.roadDistances,
  });
  return { bestRealCostStationIds };
}
