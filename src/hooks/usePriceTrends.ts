'use client'

import { useEffect } from 'react'
import { useDuckDB } from '@/components/DuckDBProvider'
import { useAppStore } from '@/store/useAppStore'
import { fetchPriceTrends } from '@/lib/priceTrends'

export function usePriceTrends() {
  const { db } = useDuckDB()
  const stations = useAppStore((s) => s.stations)
  const selectedDepartment = useAppStore((s) => s.selectedDepartment)
  const setPriceTrends = useAppStore((s) => s.setPriceTrends)
  const setArePriceTrendsLoading = useAppStore((s) => s.setArePriceTrendsLoading)

  useEffect(() => {
    if (!db || !selectedDepartment || stations.length === 0) return

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
      setArePriceTrendsLoading(false) // reset loading si le composant est démonté avant résolution
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, selectedDepartment, stations.length]) // selectedDepartment pour AC #5 ; stations.length pour capter les depts limitrophes
}
