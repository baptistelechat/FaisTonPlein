import { filterStationsByLocation, isPointInGeometry } from '@/lib/utils';
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
    distanceMode,
    isodistanceGeometry,
  } = useAppStore();

  return useMemo(() => {
    const referenceLocation = searchLocation || userLocation;
    const byLocation = filterStationsByLocation(stations, {
      showHighwayStations,
      searchRadius,
      referenceLocation,
    });
    const withFuel = byLocation.filter((station) =>
      station.prices.some((p) => p.fuel_type === selectedFuel)
    );

    // En mode routier avec isodistance disponible : filtre point-in-polygon (vérité terrain = polygone affiché)
    if (distanceMode === 'road' && isodistanceGeometry) {
      return withFuel.filter((station) =>
        isPointInGeometry([station.lon, station.lat], isodistanceGeometry)
      );
    }

    return withFuel;
  }, [stations, selectedFuel, showHighwayStations, searchRadius, searchLocation, userLocation, distanceMode, isodistanceGeometry]);
}
