import { FUEL_TYPES, FuelType } from '@/lib/constants'
import { applyIsodistanceFilter, filterStationsByLocation } from '@/lib/utils'
import { FuelStats, useAppStore } from '@/store/useAppStore'
import { useMemo } from 'react'
import { useReferenceLocation } from './useReferenceLocation'

export function useFilteredStats(): Record<FuelType, FuelStats | null> {
  const { stations, showHighwayStations, searchRadius, distanceMode, isodistanceGeometry } = useAppStore()

  const referenceLocation = useReferenceLocation()

  return useMemo(() => {
    let filteredStations = filterStationsByLocation(stations, {
      showHighwayStations,
      searchRadius,
      referenceLocation,
    })

    filteredStations = applyIsodistanceFilter(filteredStations, distanceMode, isodistanceGeometry)

    return FUEL_TYPES.reduce(
      (acc, fuel) => {
        const prices: number[] = []
        let sum = 0
        for (const station of filteredStations) {
          const p = station.prices.find((fp) => fp.fuel_type === fuel.type)
          if (!p) continue
          prices.push(p.price)
          sum += p.price
        }
        if (prices.length === 0) {
          acc[fuel.type] = null
          return acc
        }
        const sorted = [...prices].sort((a, b) => a - b)
        const average = sum / prices.length
        const quantile = (q: number) => {
          const pos = (sorted.length - 1) * q
          const base = Math.floor(pos)
          const rest = pos - base
          const next = sorted[base + 1]
          return next === undefined
            ? sorted[base]!
            : sorted[base]! + rest * (next - sorted[base]!)
        }
        const p25 = quantile(0.25)
        const p75 = quantile(0.75)
        acc[fuel.type] = {
          min: sorted[0]!,
          max: sorted[sorted.length - 1]!,
          average,
          median: quantile(0.5),
          p10: quantile(0.1),
          p25,
          p75,
          p90: quantile(0.9),
          iqr: p75 - p25,
          stdDev: Math.sqrt(
            prices.reduce((s, v) => s + (v - average) ** 2, 0) / prices.length,
          ),
          count: prices.length,
        }
        return acc
      },
      {} as Record<FuelType, FuelStats | null>,
    )
  }, [stations, showHighwayStations, searchRadius, referenceLocation, distanceMode, isodistanceGeometry])
}
