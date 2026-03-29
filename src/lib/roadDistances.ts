import { calculateDistance } from '@/lib/utils'
import { Station } from '@/store/useAppStore'

const OSRM_TABLE_URL = 'https://router.project-osrm.org/table/v1/driving'
const MAX_STATIONS_PER_BATCH = 100
const OSRM_TIMEOUT_MS = 5000

export async function fetchRoadDistances(
  origin: [number, number], // [lon, lat]
  stations: Station[],
): Promise<Map<string, number>> {
  const sorted = [...stations].sort(
    (a, b) =>
      calculateDistance(origin[1], origin[0], a.lat, a.lon) -
      calculateDistance(origin[1], origin[0], b.lat, b.lon),
  )
  const batch = sorted.slice(0, MAX_STATIONS_PER_BATCH)

  const coords = [
    `${origin[0]},${origin[1]}`,
    ...batch.map((s) => `${s.lon},${s.lat}`),
  ].join(';')

  const url = `${OSRM_TABLE_URL}/${coords}?sources=0&destinations=all&annotations=distance`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) throw new Error(`OSRM ${res.status}`)

    const data = await res.json()
    const distances: (number | null)[] = data.distances[0]

    const result = new Map<string, number>()
    batch.forEach((station, i) => {
      const meters = distances[i + 1] // index 0 = origin→origin = 0
      if (meters !== null && meters > 0) {
        result.set(station.id, Math.round((meters / 1000) * 10) / 10)
      }
    })
    return result
  } catch {
    return new Map<string, number>()
  }
}
