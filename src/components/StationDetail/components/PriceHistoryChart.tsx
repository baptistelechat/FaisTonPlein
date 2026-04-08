'use client'

import { useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import type { FuelType } from '@/lib/constants'
import type { PriceHistoryPoint } from '@/lib/priceHistory'
import { Skeleton } from '@/components/ui/skeleton'

interface PriceHistoryChartProps {
  data: PriceHistoryPoint[]
  isLoading: boolean
  selectedFuel: FuelType
}

export function PriceHistoryChart({ data, isLoading, selectedFuel }: PriceHistoryChartProps) {
  // Recharts SVG n'accepte pas les CSS custom properties — résolution au runtime
  const strokeColor = useMemo(() => {
    if (typeof window === 'undefined') return '#4F46E5'
    return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#4F46E5'
  }, [])

  if (isLoading) return <Skeleton className='h-40 w-full rounded-md' />

  if (data.length === 0) {
    return (
      <p className='text-muted-foreground py-4 text-center text-sm'>
        Aucune donnée historique disponible
      </p>
    )
  }

  const prices = data.map((d) => d.price).filter((p): p is number => p !== null)
  const minPrice = Math.min(...prices) - 0.05
  const maxPrice = Math.max(...prices) + 0.05

  return (
    <ResponsiveContainer width='100%' height={160}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray='3 3' stroke='currentColor' strokeOpacity={0.1} />
        <XAxis
          dataKey='date'
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(val: string) => val.slice(5)} // 'YYYY-MM-DD' → 'MM-DD'
          interval='preserveStartEnd'
        />
        <YAxis
          domain={[minPrice, maxPrice]}
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v.toFixed(2)}€`}
          width={42}
        />
        <Tooltip
          formatter={(value: unknown) => [`${Number(value).toFixed(3)} €/L`, selectedFuel]}
          labelFormatter={(label: string) => {
            const [y, m, d] = label.split('-')
            return `${d}/${m}/${y}`
          }}
          contentStyle={{ fontSize: 12 }}
        />
        <Line
          type='monotone'
          dataKey='price'
          stroke={strokeColor}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
