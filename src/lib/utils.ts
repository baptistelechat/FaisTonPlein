import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return "< 1 min";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}min` : `${hours}h`;
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const getDeptFromStationId = (stationId: string): string => {
  const s = String(stationId);
  if (/^97[1-6]/.test(s)) return s.slice(0, 3); // DOM-TOM: 971–976
  if (/^2[AB]/i.test(s)) return s.slice(0, 2); // Corse : "2A..." → "2A", "2B..." → "2B"
  return s.slice(0, 2); // Métropole
};

type FilterableStation = {
  lat: number;
  lon: number;
  isHighway: boolean;
};

export function filterStationsByLocation<T extends FilterableStation>(
  stations: T[],
  opts: {
    showHighwayStations: boolean;
    searchRadius: number;
    referenceLocation: [number, number] | null;
  },
): T[] {
  return stations.filter((station) => {
    if (!opts.showHighwayStations && station.isHighway) return false;
    if (opts.searchRadius > 0 && opts.referenceLocation !== null) {
      const dist = calculateDistance(
        opts.referenceLocation[1],
        opts.referenceLocation[0],
        station.lat,
        station.lon,
      );
      if (dist > opts.searchRadius) return false;
    }
    return true;
  });
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

export function getStationDistance(
  station: { id: string; lat: number; lon: number },
  referenceLocation: [number, number],
  roadDistances?: Record<string, number>,
): number {
  if (roadDistances !== undefined && roadDistances[station.id] !== undefined) {
    return roadDistances[station.id];
  }
  return (
    Math.round(
      calculateDistance(
        referenceLocation[1],
        referenceLocation[0],
        station.lat,
        station.lon,
      ) * 10,
    ) / 10
  );
}

export function calculateEffectiveCost(params: {
  pricePerLiter: number;
  distanceKm: number;
  fillAmount: number;
  consumption: number;
}): { fillCost: number; travelCost: number; total: number } {
  const { pricePerLiter, distanceKm, fillAmount, consumption } = params;
  const fillCost = pricePerLiter * fillAmount;
  const travelCost = pricePerLiter * distanceKm * (consumption / 100);
  return { fillCost, travelCost, total: fillCost + travelCost };
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
  roadDistances,
}: {
  stations: StationLike[];
  selectedFuel: string;
  referenceLocation: [number, number] | null;
  roadDistances?: Record<string, number>;
}) {
  let minPrice = Number.POSITIVE_INFINITY;
  let minDistance = Number.POSITIVE_INFINITY;
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
      const dist = getStationDistance(
        station,
        referenceLocation,
        roadDistances,
      );
      if (dist < minDistance) {
        minDistance = dist;
        bestDistanceStationIds = [station.id];
      } else if (dist === minDistance) {
        bestDistanceStationIds.push(station.id);
      }
    }
  }

  return { bestPriceStationIds, bestDistanceStationIds };
}

export function getBestRealCostStation({
  stations,
  selectedFuel,
  referenceLocation,
  consumption,
  tankCapacity,
  fillHabit,
  roadDistances,
}: {
  stations: StationLike[];
  selectedFuel: string;
  referenceLocation: [number, number] | null;
  consumption: number;
  tankCapacity: number;
  fillHabit: number;
  roadDistances?: Record<string, number>;
}): { bestRealCostStationIds: string[] } {
  if (!referenceLocation || consumption <= 0 || tankCapacity <= 0) {
    return { bestRealCostStationIds: [] };
  }

  const fillAmount = tankCapacity * fillHabit;
  let minCost = Number.POSITIVE_INFINITY;
  let bestRealCostStationIds: string[] = [];

  for (const station of stations) {
    const fuelPrice = station.prices.find((p) => p.fuel_type === selectedFuel);
    if (!fuelPrice) continue;

    const cost = calculateEffectiveCost({
      pricePerLiter: fuelPrice.price,
      distanceKm: getStationDistance(station, referenceLocation, roadDistances),
      fillAmount,
      consumption,
    }).total;

    if (cost < minCost) {
      minCost = cost;
      bestRealCostStationIds = [station.id];
    } else if (cost === minCost) {
      bestRealCostStationIds.push(station.id);
    }
  }

  return { bestRealCostStationIds };
}

export function formatPrice(value: number): string {
  return `${value.toFixed(3)}€/L`;
}

function isPointInRing(
  point: [number, number],
  ring: [number, number][],
): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isPointInGeometry(
  point: [number, number],
  geometry: GeoJSON.Geometry,
): boolean {
  if (geometry.type === "Polygon") {
    if (!isPointInRing(point, geometry.coordinates[0] as [number, number][]))
      return false;
    for (let i = 1; i < geometry.coordinates.length; i++) {
      if (isPointInRing(point, geometry.coordinates[i] as [number, number][]))
        return false;
    }
    return true;
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygon) => {
      if (!isPointInRing(point, polygon[0] as [number, number][])) return false;
      for (let i = 1; i < polygon.length; i++) {
        if (isPointInRing(point, polygon[i] as [number, number][]))
          return false;
      }
      return true;
    });
  }
  return false;
}

export function applyIsodistanceFilter<T extends { lon: number; lat: number }>(
  stations: T[],
  distanceMode: "road" | "crow-fly",
  isodistanceGeometry: GeoJSON.Geometry | null,
): T[] {
  if (distanceMode !== "road" || !isodistanceGeometry) return stations;
  return stations.filter((s) =>
    isPointInGeometry([s.lon, s.lat], isodistanceGeometry),
  );
}
