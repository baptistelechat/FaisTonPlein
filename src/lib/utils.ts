import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

type FilterableStation = {
  lat: number
  lon: number
  isHighway: boolean
}

export function filterStationsByLocation<T extends FilterableStation>(
  stations: T[],
  opts: {
    showHighwayStations: boolean
    searchRadius: number
    referenceLocation: [number, number] | null
  }
): T[] {
  return stations.filter((station) => {
    if (!opts.showHighwayStations && station.isHighway) return false
    if (opts.searchRadius > 0 && opts.referenceLocation !== null) {
      const dist = calculateDistance(
        opts.referenceLocation[1],
        opts.referenceLocation[0],
        station.lat,
        station.lon,
      )
      if (dist > opts.searchRadius) return false
    }
    return true
  })
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

type FuelPriceLike = {
  fuel_type: string;
  price: number;
};

type StationLike = {
  id: string;
  lat: number;
  lon: number;
  prices: FuelPriceLike[];
};

export function getBestStationsForFuel({
  stations,
  selectedFuel,
  referenceLocation,
}: {
  stations: StationLike[];
  selectedFuel: string;
  referenceLocation: [number, number] | null;
}) {
  let minPrice = Number.POSITIVE_INFINITY;
  let minDistanceRounded = Number.POSITIVE_INFINITY;
  let bestPriceStationIds: string[] = [];
  let bestDistanceStationIds: string[] = [];

  for (const station of stations) {
    const fuelPrice = station.prices.find((p) => p.fuel_type === selectedFuel);
    if (!fuelPrice) continue;

    const price = fuelPrice.price;
    if (price < minPrice) {
      minPrice = price;
      bestPriceStationIds = [station.id];
    } else if (price === minPrice) {
      bestPriceStationIds.push(station.id);
    }

    if (referenceLocation) {
      const dist = calculateDistance(
        referenceLocation[1],
        referenceLocation[0],
        station.lat,
        station.lon,
      );
      const distRounded = Math.round(dist * 10) / 10;
      if (distRounded < minDistanceRounded) {
        minDistanceRounded = distRounded;
        bestDistanceStationIds = [station.id];
      } else if (distRounded === minDistanceRounded) {
        bestDistanceStationIds.push(station.id);
      }
    }
  }

  return { bestPriceStationIds, bestDistanceStationIds };
}
