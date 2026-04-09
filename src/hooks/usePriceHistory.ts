'use client'

import { useState, useEffect } from 'react'
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

  useEffect(() => {
    if (!db || !selectedStation) return

    const today = new Date().toISOString().slice(0, 10)
    const cacheKey = `${selectedStation.id}_${selectedFuel}_${today}`
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, selectedStation?.id, selectedFuel])

  if (!db || !selectedStation) {
    return { data: [], isLoading: false }
  }

  return { data, isLoading }
}
