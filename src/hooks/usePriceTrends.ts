'use client'

import { useEffect } from 'react'
import { useDuckDB } from '@/components/DuckDBProvider'
import { useAppStore } from '@/store/useAppStore'
import { fetchPriceTrends } from '@/lib/priceTrends'

export function usePriceTrends() {
  const { db } = useDuckDB()
  const selectedDepartment = useAppStore((s) => s.selectedDepartment)
  const stations = useAppStore((s) => s.stations)
  const setPriceTrends = useAppStore((s) => s.setPriceTrends)

  useEffect(() => {
    if (!db || !selectedDepartment || stations.length === 0) return

    let isMounted = true

    fetchPriceTrends(db, stations, selectedDepartment)
      .then((trends) => {
        if (isMounted) setPriceTrends(trends)
      })
      .catch(() => {
        // Fallback silencieux — aucune erreur visible
      })

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, selectedDepartment, stations.length]) // stations.length pour éviter les re-renders infinis
}
