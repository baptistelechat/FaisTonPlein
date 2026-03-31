import type { Geometry } from 'geojson'

const IGN_ISOCHRONE_URL = 'https://data.geopf.fr/navigation/isochrone'
const IGN_TIMEOUT_MS = 6000

export async function fetchIsodistance(
  origin: [number, number], // [lon, lat]
  radiusKm: number,
): Promise<Geometry | null> {
  const params = new URLSearchParams({
    resource: 'bdtopo-pgr',
    profile: 'car',
    costType: 'distance',
    costValue: String(radiusKm * 1000), // mètres
    point: `${origin[0]},${origin[1]}`,
    direction: 'departure',
    geometryFormat: 'geojson',
  })

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), IGN_TIMEOUT_MS)
    const res = await fetch(`${IGN_ISOCHRONE_URL}?${params}`, {
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) throw new Error(`IGN ${res.status}`)

    const data = await res.json()
    // La réponse IGN est un GeoJSON Feature ou une Geometry directe
    return (data.geometry ?? data) as Geometry | null
  } catch {
    return null // Fallback : le cercle existant reste affiché
  }
}
