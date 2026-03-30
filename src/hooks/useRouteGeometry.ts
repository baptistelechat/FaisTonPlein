'use client'

import { useAppStore } from '@/store/useAppStore'
import { useEffect, useMemo, useRef, useState } from 'react'

const OSRM_ROUTE_URL = 'https://router.project-osrm.org/route/v1/driving'
const OSRM_ROUTE_TIMEOUT_MS = 8000

async function fetchOsrmRoute(
  origin: [number, number],
  destination: [number, number],
): Promise<[number, number][] | null> {
  const url = `${OSRM_ROUTE_URL}/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?overview=full&geometries=geojson`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), OSRM_ROUTE_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) return null
    const data = await res.json()
    return (data.routes?.[0]?.geometry?.coordinates as [number, number][]) ?? null
  } catch {
    clearTimeout(timeout)
    return null
  }
}

type CachedRoadRoute = {
  key: string
  coords: [number, number][]
}

export type RouteGeometry = {
  coordinates: [number, number][]
  isRoad: boolean
}

export function useRouteGeometry(): RouteGeometry | null {
  const selectedStation = useAppStore((s) => s.selectedStation)
  const userLocation = useAppStore((s) => s.userLocation)
  const searchLocation = useAppStore((s) => s.searchLocation)
  const distanceMode = useAppStore((s) => s.distanceMode)
  const roadDistances = useAppStore((s) => s.roadDistances)

  const [cachedRoadRoute, setCachedRoadRoute] = useState<CachedRoadRoute | null>(null)
  // Track the last fetch key to avoid redundant OSRM calls
  const fetchedKeyRef = useRef<string | null>(null)

  const origin = searchLocation ?? userLocation
  const stationId = selectedStation?.id
  const stationLon = selectedStation?.lon
  const stationLat = selectedStation?.lat
  const originLon = origin?.[0]
  const originLat = origin?.[1]

  // Fetch road geometry when a station with a known road distance is selected
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
    fetchOsrmRoute([originLon, originLat], [stationLon, stationLat]).then((coords) => {
      if (cancelled) return
      setCachedRoadRoute({
        key: routeKey,
        coords: coords ?? [[originLon, originLat], [stationLon, stationLat]],
      })
    })
    return () => { cancelled = true }
  }, [stationId, stationLon, stationLat, originLon, originLat, distanceMode, roadDistances])

  // Memoized return — stable reference, only changes when actual route data changes
  return useMemo((): RouteGeometry | null => {
    if (
      !stationId ||
      stationLon === undefined ||
      stationLat === undefined ||
      originLon === undefined ||
      originLat === undefined
    ) return null

    const routeKey = `${stationId}:${originLon},${originLat}`

    // Cache checked first — stays stable even if roadDistances temporarily resets
    if (distanceMode === 'road' && cachedRoadRoute?.key === routeKey) {
      return { coordinates: cachedRoadRoute.coords, isRoad: true }
    }

    // In road mode: show nothing until the real route is ready (avoid straight-line flash)
    if (distanceMode === 'road') return null

    // Crow-fly mode: straight line immediately
    return {
      coordinates: [[originLon, originLat], [stationLon, stationLat]],
      isRoad: false,
    }
  }, [stationId, stationLon, stationLat, originLon, originLat, distanceMode, cachedRoadRoute])
}
