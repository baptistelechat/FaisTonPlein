import { FUEL_TYPES, FuelType } from "@/lib/constants";
import { FuelPrice, Station } from "@/store/useAppStore";

export interface RawStationData {
  id: string;
  latitude: number | bigint;
  longitude: number | bigint;
  "Code postal": string;
  Adresse: string;
  Ville: string;
  prix: string; // JSON string "[{\"@nom\": \"Gazole\", \"@id\": \"1\", \"@maj\": \"2024-01-01 00:00:00\", \"@valeur\": \"1.750\"}]"
  services: string | null; // JSON string or null
  "Automate 24-24 (oui/non)": string | null;
  [key: string]: unknown;
}

interface RawFuelPrice {
  "@nom": string;
  "@id": string;
  "@maj": string;
  "@valeur": string;
}

function mapFuelType(rawName: string): FuelType | "Unknown" {
  const isKnownFuel = FUEL_TYPES.some((fuel) => fuel.type === rawName);
  if (isKnownFuel) {
    return rawName as FuelType;
  }
  return "Unknown";
}

export function mapRawDataToStation(raw: RawStationData): Station {
  // Convert lat/lon from integers (e.g. 4884200) to float (48.84200)
  // Data.gouv provides coordinates multiplied by 100,000
  const lat = Number(raw.latitude) / 100000;
  const lon = Number(raw.longitude) / 100000;

  // Parse prices
  let prices: FuelPrice[] = [];
  try {
    if (raw.prix) {
      const parsedPrices = JSON.parse(raw.prix);
      const pricesArray: RawFuelPrice[] = Array.isArray(parsedPrices)
        ? parsedPrices
        : [parsedPrices];

      prices = pricesArray
        .map((p) => {
          const type = mapFuelType(p["@nom"]);
          if (type === "Unknown") return null;
          return {
            fuel_type: type,
            price: parseFloat(p["@valeur"]),
            updated_at: p["@maj"], // TODO: Convert to ISO string if needed?
          };
        })
        .filter((p): p is FuelPrice => p !== null);
    }
  } catch (e) {
    console.error(`Error parsing prices for station ${raw.id}`, e);
  }

  // Parse services
  let services: string[] = [];
  try {
    if (raw.services) {
      // Services might be a simple string array in JSON or a complex object depending on the source structure
      // Based on the screenshot it was null, but let's handle array of strings if it comes as JSON
      const parsedServices = JSON.parse(raw.services);
      if (Array.isArray(parsedServices)) {
        services = parsedServices; // Assuming it's already an array of strings
      } else if (
        typeof parsedServices === "object" &&
        parsedServices !== null
      ) {
        // Handle if it's { service: ["..."] } or similar
        services = Object.values(parsedServices).flat() as string[];
      }
    }
  } catch (e) {
    console.warn(`Error parsing services for station ${raw.id}`, e);
  }

  const is24h =
    raw['Automate 24-24 (oui/non)']?.toLowerCase() === 'oui' ||
    services.includes('Automate CB 24/24');

  return {
    id: raw.id,
    name: 'Station service',
    lat,
    lon,
    address: `${raw.Adresse}, ${raw["Code postal"]} ${raw.Ville}`,
    services,
    prices,
    is24h,
  };
}
