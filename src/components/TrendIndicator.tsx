'use client'

import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
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
    direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus
  const color =
    direction === 'up'
      ? 'text-rose-500'
      : direction === 'down'
        ? 'text-emerald-500'
        : 'text-muted-foreground'

  return <Icon className={cn('size-3', color, className)} />
}
