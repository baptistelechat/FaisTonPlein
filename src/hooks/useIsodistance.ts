'use client'

import { fetchIsodistance } from '@/lib/isodistance'
import { useAppStore } from '@/store/useAppStore'
import { useEffect } from 'react'

export function useIsodistance(): void {
  const userLocation = useAppStore((s) => s.userLocation)
  const searchLocation = useAppStore((s) => s.searchLocation)
  const searchRadius = useAppStore((s) => s.searchRadius)
  const distanceMode = useAppStore((s) => s.distanceMode)
  const setIsodistanceGeometry = useAppStore((s) => s.setIsodistanceGeometry)

  const referenceLocation = searchLocation ?? userLocation
  // Clé stable par valeur pour éviter les re-triggers sur nouvelle instance de tableau
  const locationKey = referenceLocation
    ? `${referenceLocation[0]},${referenceLocation[1]}`
    : null

  useEffect(() => {
    if (distanceMode !== 'road' || !locationKey) {
      setIsodistanceGeometry(null)
      return
    }

    setIsodistanceGeometry(null) // vide l'ancienne géométrie avant la nouvelle fetch
    let cancelled = false
    const [lon, lat] = locationKey.split(',').map(Number) as [number, number]
    fetchIsodistance([lon, lat], searchRadius).then((geo) => {
      if (!cancelled) setIsodistanceGeometry(geo)
    })

    return () => {
      cancelled = true
    }
  }, [locationKey, searchRadius, distanceMode, setIsodistanceGeometry])
}
