'use client'

import { calculateDistance } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { useEffect, useMemo, useRef, useState } from 'react'

const OSRM_ROUTE_URL = 'https://router.project-osrm.org/route/v1/driving'
const OSRM_ROUTE_TIMEOUT_MS = 8000

type OsrmRouteResult = {
  coordinates: [number, number][]
  durationSeconds: number | null
}

async function fetchOsrmRoute(
  origin: [number, number],
  destination: [number, number],
): Promise<OsrmRouteResult | null> {
  const url = `${OSRM_ROUTE_URL}/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?overview=full&geometries=geojson`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), OSRM_ROUTE_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) return null
    const data = await res.json()
    const coordinates = (data.routes?.[0]?.geometry?.coordinates as [number, number][]) ?? null
    if (!coordinates) return null
    const durationSeconds = typeof data.routes?.[0]?.duration === 'number'
      ? Math.round(data.routes[0].duration)
      : null
    return { coordinates, durationSeconds }
  } catch {
    clearTimeout(timeout)
    return null
  }
}

type CachedRoadRoute = {
  key: string
  coords: [number, number][]
  durationSeconds: number | null
}

export type RouteGeometry = {
  coordinates: [number, number][]
  isRoad: boolean
  durationSeconds: number | null
  distanceKm: number | null
}

export function useRouteGeometry(): RouteGeometry | null {
  const selectedStation = useAppStore((s) => s.selectedStation)
  const userLocation = useAppStore((s) => s.userLocation)
  const searchLocation = useAppStore((s) => s.searchLocation)
  const distanceMode = useAppStore((s) => s.distanceMode)
  const roadDistances = useAppStore((s) => s.roadDistances)
  const isLoadingRoadDistances = useAppStore((s) => s.isLoadingRoadDistances)

  const [cachedRoadRoute, setCachedRoadRoute] = useState<CachedRoadRoute | null>(null)
  const fetchedKeyRef = useRef<string | null>(null)

  const origin = searchLocation ?? userLocation
  const stationId = selectedStation?.id
  const stationLon = selectedStation?.lon
  const stationLat = selectedStation?.lat
  const originLon = origin?.[0]
  const originLat = origin?.[1]

  useEffect(() => {
    if (
      !stationId ||
      stationLon === undefined ||
      stationLat === undefined ||
      originLon === undefined ||
      originLat === undefined ||
      distanceMode !== 'road' ||
      roadDistances[stationId] === undefined
    ) return

    const routeKey = `${stationId}:${originLon},${originLat}`
    if (fetchedKeyRef.current === routeKey) return
    fetchedKeyRef.current = routeKey

    let cancelled = false
    fetchOsrmRoute([originLon, originLat], [stationLon, stationLat]).then((result) => {
      if (cancelled) return
      setCachedRoadRoute({
        key: routeKey,
        coords: result?.coordinates ?? [[originLon, originLat], [stationLon, stationLat]],
        durationSeconds: result?.durationSeconds ?? null,
      })
    })
    return () => { cancelled = true }
  }, [stationId, stationLon, stationLat, originLon, originLat, distanceMode, roadDistances])

  return useMemo((): RouteGeometry | null => {
    if (
      !stationId ||
      stationLon === undefined ||
      stationLat === undefined ||
      originLon === undefined ||
      originLat === undefined
    ) return null

    const routeKey = `${stationId}:${originLon},${originLat}`

    if (distanceMode === 'road' && cachedRoadRoute?.key === routeKey) {
      return {
        coordinates: cachedRoadRoute.coords,
        isRoad: true,
        durationSeconds: cachedRoadRoute.durationSeconds,
        distanceKm: roadDistances[stationId] ?? null,
      }
    }

    if (distanceMode === 'road') {
      // OSRM a fini de charger mais n'a pas de route pour cette station → fallback vol d'oiseau
      if (!isLoadingRoadDistances && roadDistances[stationId] === undefined) {
        return {
          coordinates: [[originLon, originLat], [stationLon, stationLat]],
          isRoad: false,
          durationSeconds: null,
          distanceKm: Math.round(calculateDistance(originLat, originLon, stationLat, stationLon) * 10) / 10,
        }
      }
      return null
    }

    return {
      coordinates: [[originLon, originLat], [stationLon, stationLat]],
      isRoad: false,
      durationSeconds: null,
      distanceKm: Math.round(calculateDistance(originLat, originLon, stationLat, stationLon) * 10) / 10,
    }
  }, [stationId, stationLon, stationLat, originLon, originLat, distanceMode, cachedRoadRoute, isLoadingRoadDistances, roadDistances])
}
