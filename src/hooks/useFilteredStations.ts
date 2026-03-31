import { applyIsodistanceFilter, filterStationsByLocation } from '@/lib/utils';
import { Station, useAppStore } from '@/store/useAppStore';
import { useMemo } from 'react';
import { useReferenceLocation } from './useReferenceLocation';

export function useFilteredStations(): Station[] {
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
    const withFuel = byLocation.filter((station) =>
      station.prices.some((p) => p.fuel_type === selectedFuel)
    );

    return applyIsodistanceFilter(withFuel, distanceMode, isodistanceGeometry);
  }, [stations, selectedFuel, showHighwayStations, searchRadius, referenceLocation, distanceMode, isodistanceGeometry]);
}
