import { FuelType } from "@/lib/constants";
import { applyIsodistanceFilter, filterStationsByLocation } from "@/lib/utils";
import { Station, useAppStore } from "@/store/useAppStore";
import { useMemo } from "react";
import { useReferenceLocation } from "./useReferenceLocation";

export function useRuptureStations(): Station[] {
  const {
    stations,
    selectedFuel,
    showHighwayStations,
    searchRadius,
    distanceMode,
    isodistanceGeometry,
  } = useAppStore();

  const referenceLocation = useReferenceLocation();

  return useMemo(() => {
    const byLocation = filterStationsByLocation(stations, {
      showHighwayStations,
      searchRadius,
      referenceLocation,
    });
    const inRupture = byLocation.filter(
      (station) =>
        station.ruptureFuels.includes(selectedFuel as FuelType) &&
        !station.prices.some((p) => p.fuel_type === selectedFuel),
    );

    return applyIsodistanceFilter(inRupture, distanceMode, isodistanceGeometry);
  }, [
    stations,
    selectedFuel,
    showHighwayStations,
    searchRadius,
    referenceLocation,
    distanceMode,
    isodistanceGeometry,
  ]);
}
