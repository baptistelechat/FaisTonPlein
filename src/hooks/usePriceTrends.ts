'use client'

import { useEffect } from 'react'
import { useDuckDB } from '@/components/DuckDBProvider'
import { useAppStore } from '@/store/useAppStore'
import { fetchPriceTrends } from '@/lib/priceTrends'

export function usePriceTrends() {
  const { db } = useDuckDB()
  const stations = useAppStore((s) => s.stations)
  const setPriceTrends = useAppStore((s) => s.setPriceTrends)
  const setArePriceTrendsLoading = useAppStore((s) => s.setArePriceTrendsLoading)

  useEffect(() => {
    if (!db || stations.length === 0) return

    let isMounted = true
    setArePriceTrendsLoading(true)

    fetchPriceTrends(db, stations)
      .then((trends) => {
        if (isMounted) {
          setPriceTrends(trends)
          setArePriceTrendsLoading(false)
        }
      })
      .catch(() => {
        if (isMounted) setArePriceTrendsLoading(false)
        // Fallback silencieux — aucune erreur visible
      })

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, stations.length]) // stations.length pour éviter les re-renders infinis
}
