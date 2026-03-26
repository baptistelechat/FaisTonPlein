import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
  let bestPriceStationId: string | null = null;
  let bestPrice = Number.POSITIVE_INFINITY;

  let bestDistanceStationId: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const station of stations) {
    const fuelPrice = station.prices.find((p) => p.fuel_type === selectedFuel);
    if (!fuelPrice) continue;

    if (fuelPrice.price < bestPrice) {
      bestPrice = fuelPrice.price;
      bestPriceStationId = station.id;
    }

    if (referenceLocation) {
      const dist = calculateDistance(
        referenceLocation[1],
        referenceLocation[0],
        station.lat,
        station.lon,
      );
      if (dist < bestDistance) {
        bestDistance = dist;
        bestDistanceStationId = station.id;
      }
    }
  }

  return { bestPriceStationId, bestDistanceStationId };
}
