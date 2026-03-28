'use client'

import { cn } from '@/lib/utils'
import { getPriceTextColor } from '@/lib/priceColor'
import {
  formatPriceAge,
  FRESHNESS_DOT_COLORS,
  FRESHNESS_TEXT_COLORS,
  getPriceFreshness,
} from '@/lib/priceFreshness'
import { FuelPrice, FuelStats, useAppStore } from '@/store/useAppStore'

export const PriceCard = ({
  price,
  selectedFuel,
  filteredStats,
  inlineEstimate = false,
}: {
  price: FuelPrice
  selectedFuel: string
  filteredStats: FuelStats | null
  inlineEstimate?: boolean
}) => {
  const priceColor = getPriceTextColor(price.price, filteredStats)
  const tankCapacity = useAppStore((s) => s.tankCapacity)

  let diffBadge = null
  if (filteredStats) {
    const diff = price.price - filteredStats.median
    const isGood = priceColor === 'text-emerald-600'
    const isBad = priceColor === 'text-rose-600'
    const colorClass = isGood
      ? 'bg-emerald-500/10 text-emerald-500'
      : isBad
        ? 'bg-rose-500/10 text-rose-500'
        : 'bg-amber-500/10 text-amber-500'
    diffBadge = (
      <span className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold ${colorClass}`}>
        {`${diff > 0 ? '+ ' : '- '}${Math.abs(diff).toFixed(3)}€`}
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
        <span className='text-muted-foreground text-[10px] font-bold tracking-widest uppercase'>
          {price.fuel_type}
        </span>
        {diffBadge}
      </div>
      <div className='flex items-baseline gap-1'>
        <span className={cn('font-mono text-xl font-extrabold tracking-tighter', priceColor)}>
          {price.price.toFixed(3)}
        </span>
        <span className='text-xs font-semibold opacity-70'>€</span>
        {inlineEstimate && tankCapacity > 0 && (
          <span className='text-muted-foreground text-[10px] font-medium'>
            (~{(tankCapacity * price.price).toFixed(0)}€ le plein)
          </span>
        )}
      </div>
      {!inlineEstimate && tankCapacity > 0 && (
        <span className='text-muted-foreground text-[10px] font-medium'>
          ~{(tankCapacity * price.price).toFixed(0)}€ le plein
        </span>
      )}
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
