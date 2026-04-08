'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDuckDB } from '@/components/DuckDBProvider'
import { useAppStore } from '@/store/useAppStore'
import { fetchStationPriceHistory, type PriceHistoryPoint } from '@/lib/priceHistory'
import { getDeptFromStationId } from '@/lib/priceTrends'

// Cache module-level — persiste toute la session (survit aux unmounts du composant)
const historyCache = new Map<string, PriceHistoryPoint[]>()

export function usePriceHistory() {
  const { db } = useDuckDB()
  const selectedStation = useAppStore((s) => s.selectedStation)
  const selectedFuel = useAppStore((s) => s.selectedFuel)

  const [data, setData] = useState<PriceHistoryPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  // Reset visibilité + data quand on change de station
  useEffect(() => {
    setIsVisible(false)
    setData([])
    setIsLoading(false)
  }, [selectedStation?.id])

  // Re-fetch quand le carburant change pendant que le graphique est visible
  useEffect(() => {
    if (!isVisible || !db || !selectedStation) return

    const cacheKey = `${selectedStation.id}_${selectedFuel}`
    const cached = historyCache.get(cacheKey)

    if (cached) {
      setData(cached)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setData([])

    const dept = getDeptFromStationId(selectedStation.id)
    fetchStationPriceHistory(db, selectedStation.id, dept, selectedFuel)
      .then((history) => {
        if (cancelled) return
        historyCache.set(cacheKey, history)
        setData(history)
      })
      .catch(() => {
        if (!cancelled) setData([])
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedFuel]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleVisibility = useCallback(async () => {
    if (isVisible) {
      setIsVisible(false)
      return
    }

    if (!db || !selectedStation) return

    const cacheKey = `${selectedStation.id}_${selectedFuel}`
    const cached = historyCache.get(cacheKey)

    if (cached) {
      setData(cached)
      setIsVisible(true)
      return
    }

    setIsVisible(true)
    setIsLoading(true)

    const dept = getDeptFromStationId(selectedStation.id)
    try {
      const history = await fetchStationPriceHistory(db, selectedStation.id, dept, selectedFuel)
      historyCache.set(cacheKey, history)
      setData(history)
    } catch {
      setData([])
    } finally {
      setIsLoading(false)
    }
  }, [db, selectedStation, selectedFuel, isVisible])

  return { data, isLoading, isVisible, toggleVisibility }
}
