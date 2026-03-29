'use client'

import { useFilteredStations } from '@/hooks/useFilteredStations'
import { fetchRoadDistances } from '@/lib/roadDistances'
import { useAppStore } from '@/store/useAppStore'
import { useEffect, useRef } from 'react'

export function useRoadDistances() {
  const {
    userLocation,
    searchLocation,
    distanceMode,
    setRoadDistances,
    setIsLoadingRoadDistances,
  } = useAppStore()
  const filteredStations = useFilteredStations()
  const referenceLocation = searchLocation ?? userLocation

  // Cache des distances par position de référence — évite de rappeler OSRM quand
  // l'isodistance IGN arrive et réduit le set de stations (elles sont déjà calculées)
  const distanceCacheRef = useRef<Map<string, number>>(new Map())
  const cachedLocationKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (distanceMode !== 'road' || !referenceLocation || filteredStations.length === 0) {
      setRoadDistances({})
      setIsLoadingRoadDistances(false)
      return
    }

    const locationKey = `${referenceLocation[0]},${referenceLocation[1]}`

    // Invalider le cache si la position de référence a changé
    if (cachedLocationKeyRef.current !== locationKey) {
      distanceCacheRef.current = new Map()
      cachedLocationKeyRef.current = locationKey
    }

    const missing = filteredStations.filter((s) => !distanceCacheRef.current.has(s.id))

    if (missing.length === 0) {
      // Toutes les distances sont déjà en cache — juste filtrer et publier
      const result: Record<string, number> = {}
      filteredStations.forEach((s) => {
        const d = distanceCacheRef.current.get(s.id)
        if (d !== undefined) result[s.id] = d
      })
      setRoadDistances(result)
      setIsLoadingRoadDistances(false)
      return
    }

    let cancelled = false
    setIsLoadingRoadDistances(true)
    fetchRoadDistances(referenceLocation, filteredStations).then((map) => {
      if (cancelled) return
      map.forEach((v, k) => distanceCacheRef.current.set(k, v))
      const result: Record<string, number> = {}
      filteredStations.forEach((s) => {
        const d = distanceCacheRef.current.get(s.id)
        if (d !== undefined) result[s.id] = d
      })
      setRoadDistances(result)
      setIsLoadingRoadDistances(false)
    })

    return () => { cancelled = true }
  }, [referenceLocation, filteredStations, distanceMode, setRoadDistances, setIsLoadingRoadDistances])
}
