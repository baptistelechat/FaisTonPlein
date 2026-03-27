import { FUEL_TYPES } from "@/lib/constants";
import { capitalize } from "@/lib/utils";
import { FuelPrice, Station } from "@/store/useAppStore";

export interface RawStationData {
  id: string;
  latitude: number | bigint;
  longitude: number | bigint;
  "Code postal": string;
  Adresse: string;
  Ville: string;
  services: string | null;
  "Automate 24-24 (oui/non)": string | null;
  pop?: string | null; // 'A' = autoroute, 'R' = route nationale/départementale
  // Colonnes prix par carburant (remplacent le champ JSON 'prix')
  "Prix Gazole"?: number | null;
  "Prix Gazole mis à jour le"?: string | null;
  "Prix SP95"?: number | null;
  "Prix SP95 mis à jour le"?: string | null;
  "Prix E10"?: number | null;
  "Prix E10 mis à jour le"?: string | null;
  "Prix SP98"?: number | null;
  "Prix SP98 mis à jour le"?: string | null;
  "Prix E85"?: number | null;
  "Prix E85 mis à jour le"?: string | null;
  "Prix GPLc"?: number | null;
  "Prix GPLc mis à jour le"?: string | null;
  [key: string]: unknown;
}

export function mapRawDataToStation(raw: RawStationData): Station {
  // Convert lat/lon from integers (e.g. 4884200) to float (48.84200)
  // Data.gouv provides coordinates multiplied by 100,000
  const lat = Number(raw.latitude) / 100000;
  const lon = Number(raw.longitude) / 100000;

  // Parse prices from dedicated columns
  const prices: FuelPrice[] = FUEL_TYPES.map((fuel) => {
    const price = raw[`Prix ${fuel.type}`] as number | null | undefined;
    const updatedAt = raw[`Prix ${fuel.type} mis à jour le`] as string | number | Date | null | undefined;
    if (price == null || isNaN(price)) return null;
    return {
      fuel_type: fuel.type,
      price,
      updated_at: updatedAt ?? '',
    };
  }).filter((p): p is FuelPrice => p !== null);

  // Parse services
  let services: string[] = [];
  try {
    if (raw.services) {
      const parsedServices = JSON.parse(raw.services);
      if (Array.isArray(parsedServices)) {
        services = parsedServices;
      } else if (
        typeof parsedServices === "object" &&
        parsedServices !== null
      ) {
        services = Object.values(parsedServices).flat() as string[];
      }
    }
  } catch (e) {
    console.warn(`Error parsing services for station ${raw.id}`, e);
  }

  const is24h =
    raw['Automate 24-24 (oui/non)']?.toLowerCase() === 'oui' ||
    services.includes('Automate CB 24/24');

  const isHighway = raw.pop?.toUpperCase() === 'A';

  return {
    id: raw.id,
    name: 'Station service',
    lat,
    lon,
    address: `${capitalize(raw.Adresse)}, ${raw["Code postal"]} ${raw.Ville}`,
    services,
    prices,
    is24h,
    isHighway,
  };
}
