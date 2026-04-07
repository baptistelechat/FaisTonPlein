'use client'

import { useMemo } from 'react'
import { buildTrendKey, TrendDirection } from '@/lib/priceTrends'
import { FuelType } from '@/lib/constants'
import { formatPrice } from '@/lib/utils'
import { Station } from '@/store/useAppStore'
import { StationLogo } from '@/components/StationLogo'
import { BrandPriceChart } from './BrandPriceChart'
import { SectionTitle, StatRow } from './StatRow'
import { TrendBar, TrendSummary } from './TrendBar'
import { BrandStat, computeBrandStats } from '../helpers/brandExtraction'

// ─── Brand insight section ────────────────────────────────────────────────────

interface BrandInsightSectionProps {
  stations: Station[]
  selectedFuel: FuelType
  priceTrends: Record<string, TrendDirection>
  stationNames: Record<string, string>
  namesLoading: boolean
  totalCount: number
}

export function BrandInsightSection({
  stations,
  selectedFuel,
  priceTrends,
  stationNames,
  namesLoading,
  totalCount,
}: BrandInsightSectionProps) {
  const trendSummary = useMemo<TrendSummary>(
    () =>
      stations.reduce<TrendSummary>(
        (acc, s) => {
          const trend = priceTrends[buildTrendKey(s.id, selectedFuel)]
          if (trend === 'up') acc.up++
          else if (trend === 'down') acc.down++
          else if (trend === 'stable') acc.stable++
          else acc.unknown++
          return acc
        },
        { up: 0, down: 0, stable: 0, unknown: 0, total: stations.length },
      ),
    [stations, priceTrends, selectedFuel],
  )

  const brandStats = useMemo<BrandStat[]>(
    () => computeBrandStats(stations, selectedFuel, stationNames),
    [stations, selectedFuel, stationNames],
  )

  const top5 = useMemo(() => brandStats.slice(0, 5), [brandStats])
  const top5ByPrice = useMemo(() => [...top5].sort((a, b) => a.avgPrice - b.avgPrice), [top5])

  const gmsCount = useMemo(
    () => brandStats.filter((b) => b.isGMS).reduce((a, b) => a + b.count, 0),
    [brandStats],
  )

  const cheapestBrand = useMemo<BrandStat | null>(
    () => (brandStats.length > 0 ? [...brandStats].sort((a, b) => a.avgPrice - b.avgPrice)[0] : null),
    [brandStats],
  )

  const gmsPercent = totalCount > 0 ? ((gmsCount / totalCount) * 100).toFixed(0) : '0'

  return (
    <>
      {/* Tendances des prix — barre pleine de répartition */}
      <SectionTitle>Tendances des prix (7 derniers jours)</SectionTitle>
      <TrendBar summary={trendSummary} />

      <div className="border-border/40 my-1 border-t" />

      {/* Répartition par enseigne */}
      <SectionTitle>Répartition par enseigne</SectionTitle>

      {namesLoading ? (
        <span className="text-muted-foreground text-xs">Chargement des enseignes...</span>
      ) : (
        <div className="flex flex-col gap-4">
          {cheapestBrand && (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-950/30">
              <div className="flex items-center gap-2">
                <StationLogo name={cheapestBrand.name} size="sm" />
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Moins chère en moyenne :{' '}
                  <span className="font-semibold">{cheapestBrand.name}</span>{' '}
                  à {formatPrice(cheapestBrand.avgPrice)}
                  <span className="opacity-70">
                    {' '}({cheapestBrand.count} station{cheapestBrand.count > 1 ? 's' : ''})
                  </span>
                </p>
              </div>
            </div>
          )}

          <StatRow
            label="Grandes surfaces (GMS)"
            value={`${gmsPercent}%`}
            description={`${gmsCount} station${gmsCount > 1 ? 's' : ''} de grande surface sur ${totalCount}`}
          />

          <div className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
            Prix moyen par enseigne (Top 5)
          </div>
          <BrandPriceChart brands={top5} />

          <div className="flex flex-col gap-2">
            {top5ByPrice.map((b) => (
              <div key={b.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <StationLogo name={b.name} size="sm" />
                  <span className={b.isGMS ? 'font-semibold' : ''}>{b.name}</span>
                  {b.isGMS && (
                    <span className="text-muted-foreground text-[10px]">GMS</span>
                  )}
                </div>
                <span className="text-muted-foreground tabular-nums">
                  {b.count} stations · {formatPrice(b.avgPrice)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
