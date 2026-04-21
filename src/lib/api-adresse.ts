export type SearchResult = {
  properties: {
    id: string;
    label: string;
    context: string;
  };
  geometry: {
    coordinates: [number, number];
  };
};

export async function searchAddresses(query: string): Promise<SearchResult[]> {
  const response = await fetch(
    `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
      query,
    )}&limit=5&autocomplete=1`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch addresses");
  }

  const data = await response.json();
  return data?.features || [];
}

export async function reverseGeocode(
  lon: number,
  lat: number,
): Promise<SearchResult | null> {
  const response = await fetch(
    `https://api-adresse.data.gouv.fr/reverse/?lon=${lon}&lat=${lat}`,
  );

  if (!response.ok) {
    throw new Error("Failed to reverse geocode");
  }

  const data = await response.json();
  return data?.features?.[0] || null;
}
