'use client'

import { Scale, TrendingDown, TrendingUp } from 'lucide-react'

export interface TrendSummary {
  up: number
  down: number
  stable: number
  unknown: number
  total: number
}

export function TrendBar({ summary }: { summary: TrendSummary }) {
  const { up, down, stable } = summary
  const known = down + stable + up
  if (known === 0)
    return <span className="text-muted-foreground text-xs">Données de tendance non disponibles</span>

  const downPct = (down / known) * 100
  const stablePct = (stable / known) * 100
  const upPct = (up / known) * 100

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {down > 0 && (
          <div className="bg-emerald-500 transition-all" style={{ width: `${downPct}%` }} />
        )}
        {stable > 0 && (
          <div
            className="bg-amber-500 transition-all"
            style={{ width: `${stablePct}%` }}
          />
        )}
        {up > 0 && (
          <div className="bg-rose-500 transition-all" style={{ width: `${upPct}%` }} />
        )}
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        {down > 0 && (
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
            <TrendingDown className="size-3.5 shrink-0" />
            <span>En baisse · {downPct.toFixed(0)}%</span>
          </div>
        )}
        {stable > 0 && (
          <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
            <Scale className="size-3.5 shrink-0" />
            <span>Stables · {stablePct.toFixed(0)}%</span>
          </div>
        )}
        {up > 0 && (
          <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
            <TrendingUp className="size-3.5 shrink-0" />
            <span>En hausse · {upPct.toFixed(0)}%</span>
          </div>
        )}
      </div>
    </div>
  )
}
