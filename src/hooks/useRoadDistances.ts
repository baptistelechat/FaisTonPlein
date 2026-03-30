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

  const distanceCacheRef = useRef<Map<string, number>>(new Map())
  const cachedLocationKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (distanceMode !== 'road' || !referenceLocation || filteredStations.length === 0) {
      setRoadDistances({})
      setIsLoadingRoadDistances(false)
      return
    }

    const locationKey = `${referenceLocation[0]},${referenceLocation[1]}`

    if (cachedLocationKeyRef.current !== locationKey) {
      distanceCacheRef.current = new Map()
      cachedLocationKeyRef.current = locationKey
    }

    const missing = filteredStations.filter((s) => !distanceCacheRef.current.has(s.id))

    if (missing.length === 0) {
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

      // Si OSRM a retourné des résultats, on met à jour le cache et le store
      if (map.size > 0) {
        map.forEach((v, k) => distanceCacheRef.current.set(k, v))
        const result: Record<string, number> = {}
        filteredStations.forEach((s) => {
          const d = distanceCacheRef.current.get(s.id)
          if (d !== undefined) result[s.id] = d
        })
        setRoadDistances(result)
      }
      // Si map est vide (OSRM indisponible après tous les retries), on ne touche pas
      // aux distances existantes — les stations gardent leurs distances actuelles

      setIsLoadingRoadDistances(false)
    })

    return () => { cancelled = true }
  }, [referenceLocation, filteredStations, distanceMode, setRoadDistances, setIsLoadingRoadDistances])
}
