import { calculateDistance } from "@/lib/utils";
import { Station, useAppStore } from "@/store/useAppStore";
import { useMemo } from "react";

export function useFilteredStations(): Station[] {
  const {
    stations,
    selectedFuel,
    showHighwayStations,
    searchRadius,
    userLocation,
    searchLocation,
  } = useAppStore();

  return useMemo(() => {
    const referenceLocation = searchLocation || userLocation;

    return stations.filter((station) => {
      // 1. Filtre carburant
      if (!station.prices.some((p) => p.fuel_type === selectedFuel))
        return false;

      // 2. Filtre autoroutes
      if (!showHighwayStations && station.isHighway) return false;

      // 3. Filtre rayon (ignoré si searchRadius === 0 ou referenceLocation null)
      if (searchRadius > 0 && referenceLocation !== null) {
        const dist = calculateDistance(
          referenceLocation[1], // lat
          referenceLocation[0], // lon
          station.lat,
          station.lon,
        );
        if (dist > searchRadius) return false;
      }

      return true;
    });
  }, [
    stations,
    selectedFuel,
    showHighwayStations,
    searchRadius,
    searchLocation,
    userLocation,
  ]);
}
