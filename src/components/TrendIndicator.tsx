'use client'

import { Scale, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TrendDirection } from '@/lib/priceTrends'

export function TrendIndicator({
  direction,
  className,
}: {
  direction: TrendDirection | null
  className?: string
}) {
  if (!direction) return null

  const Icon =
    direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Scale
  const color =
    direction === 'up'
      ? 'text-rose-500'
      : direction === 'down'
        ? 'text-emerald-500'
        : 'text-amber-500'

  return <Icon className={cn('size-3.5', color, className)} />
}
