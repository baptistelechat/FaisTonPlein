import { FuelStats, useAppStore } from '@/store/useAppStore'
import { useMemo } from 'react'
import { useFilteredStations } from './useFilteredStations'

export function useFilteredStats(): FuelStats | null {
  const { selectedFuel } = useAppStore()
  const filteredStations = useFilteredStations()

  return useMemo<FuelStats | null>(() => {
    const prices: number[] = []
    let sum = 0
    for (const station of filteredStations) {
      const p = station.prices.find((fp) => fp.fuel_type === selectedFuel)
      if (!p) continue
      prices.push(p.price)
      sum += p.price
    }
    if (prices.length === 0) return null
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
    return {
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
        prices.reduce((acc, v) => acc + (v - average) ** 2, 0) / prices.length,
      ),
      count: prices.length,
    }
  }, [filteredStations, selectedFuel])
}
