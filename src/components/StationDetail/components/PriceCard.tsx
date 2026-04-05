'use client'

import { FillEstimate } from '@/components/FillEstimate'
import { TrendIndicator } from '@/components/TrendIndicator'
import { FuelType } from '@/lib/constants'
import { getPriceLevel, getPriceTextColor } from '@/lib/priceColor'
import {
  formatPriceAge,
  FRESHNESS_DOT_COLORS,
  FRESHNESS_TEXT_COLORS,
  getPriceFreshness,
} from '@/lib/priceFreshness'
import { buildTrendKey } from '@/lib/priceTrends'
import { cn, formatPrice } from '@/lib/utils'
import { FuelPrice, FuelStats, useAppStore } from '@/store/useAppStore'

export const PriceCard = ({
  price,
  selectedFuel,
  filteredStats,
  inlineEstimate = false,
  distanceKm,
  stationId,
}: {
  price: FuelPrice
  selectedFuel: string
  filteredStats: FuelStats | null
  inlineEstimate?: boolean
  distanceKm?: number | null
  stationId: string
}) => {
  const priceTrends = useAppStore((s) => s.priceTrends)
  const arePriceTrendsLoading = useAppStore((s) => s.arePriceTrendsLoading)
  const trendDirection = priceTrends[buildTrendKey(stationId, price.fuel_type as FuelType)] ?? null
  const priceColor = getPriceTextColor(price.price, filteredStats)
  const priceLevel = getPriceLevel(price.price, filteredStats)

  let diffBadge = null
  if (filteredStats && priceLevel) {
    const diff = price.price - filteredStats.median
    const colorClass =
      priceLevel === 'good'
        ? 'bg-emerald-500/10 text-emerald-500'
        : priceLevel === 'bad'
          ? 'bg-rose-500/10 text-rose-500'
          : 'bg-amber-500/10 text-amber-500'
    diffBadge = (
      <span className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold ${colorClass}`}>
        {`${diff > 0 ? '+ ' : '- '}${formatPrice(Math.abs(diff))}`}
      </span>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border p-3 transition-all',
        price.fuel_type === selectedFuel
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border/50 bg-muted/30',
      )}
    >
      <div className='mb-1 flex items-center justify-between'>
        <span className='text-muted-foreground flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase'>
          {price.fuel_type}
          <TrendIndicator direction={trendDirection} isLoading={arePriceTrendsLoading} />
        </span>
        {diffBadge}
      </div>
      <div className='flex items-baseline gap-1'>
        <span className={cn('font-mono text-xl font-extrabold tracking-tighter', priceColor)}>
          {price.price.toFixed(3)}
        </span>
        <span className='text-xs font-semibold opacity-70'>€/L</span>
        {inlineEstimate && <FillEstimate pricePerLiter={price.price} inline />}
      </div>
      {!inlineEstimate && <FillEstimate pricePerLiter={price.price} distanceKm={distanceKm} />}
      {price.updated_at && (() => {
        const freshness = getPriceFreshness(price.updated_at)
        const label = formatPriceAge(price.updated_at)
        if (!label) return null
        return (
          <div className='mt-1 flex items-center gap-1'>
            <span className={cn('size-1.5 shrink-0 rounded-full', FRESHNESS_DOT_COLORS[freshness])} />
            <span className={cn('text-[10px] font-bold', FRESHNESS_TEXT_COLORS[freshness])}>{label}</span>
          </div>
        )
      })()}
    </div>
  )
}
