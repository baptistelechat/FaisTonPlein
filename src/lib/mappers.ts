import { FuelPrice, FuelType, Station } from "@/store/useAppStore";

export interface RawStationData {
  id: string;
  latitude: number | bigint;
  longitude: number | bigint;
  "Code postal": string;
  Adresse: string;
  Ville: string;
  prix: string; // JSON string "[{\"@nom\": \"Gazole\", \"@id\": \"1\", \"@maj\": \"2024-01-01 00:00:00\", \"@valeur\": \"1.750\"}]"
  services: string | null; // JSON string or null
  [key: string]: unknown;
}

interface RawFuelPrice {
  "@nom": string;
  "@id": string;
  "@maj": string;
  "@valeur": string;
}

function mapFuelType(rawName: string): FuelType | "Unknown" {
  switch (rawName) {
    case "E10":
      return "E10";
    case "SP98":
      return "SP98";
    case "Gazole":
      return "Gazole";
    case "E85":
      return "E85";
    case "GPLc":
      return "GPLc";
    case "SP95":
      return "SP95";
    default:
      return "Unknown"; // Should we type this?
  }
}

export function mapRawDataToStation(raw: RawStationData): Station {
  // Convert lat/lon from integers (e.g. 4884200) to float (48.84200)
  const lat = Number(raw.latitude) / 100000;
  const lon = Number(raw.longitude) / 100000;

  // Helper to infer name
  const inferStationName = (raw: RawStationData): string => {
    // If we have a specific name field in the future, use it.
    // For now, try to guess from services or address, or default to generic.
    return "Station Service";
  };

  // Parse prices
  let prices: FuelPrice[] = [];
  try {
    if (raw.prix) {
      const parsedPrices: RawFuelPrice[] | RawFuelPrice = JSON.parse(raw.prix);
      const pricesArray = Array.isArray(parsedPrices)
        ? parsedPrices
        : [parsedPrices];

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
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

  return {
    id: raw.id,
    name: inferStationName(raw),
    lat,
    lon,
    address: `${raw.Adresse}, ${raw["Code postal"]} ${raw.Ville}`,
    services,
    prices,
  };
}
