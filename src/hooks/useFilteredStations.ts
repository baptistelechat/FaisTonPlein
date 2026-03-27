import { filterStationsByLocation } from '@/lib/utils';
import { Station, useAppStore } from '@/store/useAppStore';
import { useMemo } from 'react';

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
    const byLocation = filterStationsByLocation(stations, {
      showHighwayStations,
      searchRadius,
      referenceLocation,
    });
    return byLocation.filter((station) =>
      station.prices.some((p) => p.fuel_type === selectedFuel)
    );
  }, [stations, selectedFuel, showHighwayStations, searchRadius, searchLocation, userLocation]);
}
