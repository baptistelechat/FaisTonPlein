import { calculateDistance } from '@/lib/utils'
import { Station } from '@/store/useAppStore'

const OSRM_TABLE_URL = 'https://router.project-osrm.org/table/v1/driving'
const MAX_STATIONS_PER_BATCH = 100
const OSRM_TIMEOUT_MS = 10000
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1500

async function fetchWithRetry(url: string): Promise<Response> {
  let lastError: unknown
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt))
    }
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS)
    try {
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeout)
      if (res.ok) return res
      lastError = new Error(`OSRM ${res.status}`)
    } catch (err) {
      clearTimeout(timeout)
      lastError = err
    }
  }
  throw lastError
}

export type RoadData = {
  distances: Map<string, number>
  durations: Map<string, number>
}

export async function fetchRoadDistances(
  origin: [number, number], // [lon, lat]
  stations: Station[],
): Promise<RoadData> {
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

  const url = `${OSRM_TABLE_URL}/${coords}?sources=0&destinations=all&annotations=duration,distance`

  try {
    const res = await fetchWithRetry(url)
    const data = await res.json()
    const rawDistances: (number | null)[] = data.distances[0]
    const rawDurations: (number | null)[] = data.durations[0]

    const distances = new Map<string, number>()
    const durations = new Map<string, number>()
    batch.forEach((station, i) => {
      const meters = rawDistances[i + 1] // index 0 = origin→origin = 0
      if (meters !== null && meters > 0) {
        distances.set(station.id, Math.round((meters / 1000) * 10) / 10)
      }
      const seconds = rawDurations?.[i + 1]
      if (seconds !== null && seconds !== undefined && seconds > 0) {
        durations.set(station.id, Math.round(seconds))
      }
    })
    return { distances, durations }
  } catch (err) {
    console.error('[OSRM] fetchRoadDistances failed:', err)
    return { distances: new Map(), durations: new Map() }
  }
}
