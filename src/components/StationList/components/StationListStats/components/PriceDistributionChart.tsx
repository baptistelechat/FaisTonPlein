'use client'

import { formatPrice } from '@/lib/utils'
import { FuelStats } from '@/store/useAppStore'

function toPct(value: number, domainMin: number, range: number): number {
  return Math.max(0, Math.min(100, ((value - domainMin) / range) * 100))
}

interface PriceDistributionChartProps {
  stats: FuelStats
}

export function PriceDistributionChart({ stats }: PriceDistributionChartProps) {
  const { min, max, p10, p25, median, average, p75, p90, stdDev } = stats

  const pad = (max - min) * 0.12
  const domainMin = min - pad
  const domainMax = max + pad
  const range = domainMax - domainMin

  const p = (v: number) => toPct(v, domainMin, range)

  const sigmaLow = average - stdDev
  const sigmaHigh = average + stdDev

  return (
    <div className="flex flex-col gap-3">
      {/* Zone graphique — overflow visible pour les labels extérieurs */}
      <div className="relative mx-1 mt-5 h-6" style={{ overflow: 'visible' }}>

        {/* Zone ±1σ */}
        <div
          className="absolute top-0 h-full rounded border border-dashed border-indigo-300/40 bg-indigo-500/5 dark:border-indigo-500/30"
          style={{ left: `${p(sigmaLow)}%`, width: `${p(sigmaHigh) - p(sigmaLow)}%` }}
        />

        {/* Moustache gauche : min → P25 */}
        <div
          className="absolute top-1/2 h-px -translate-y-1/2 bg-muted-foreground/40"
          style={{ left: `${p(min)}%`, width: `${p(p25) - p(min)}%` }}
        />
        {/* Moustache droite : P75 → max */}
        <div
          className="absolute top-1/2 h-px -translate-y-1/2 bg-muted-foreground/40"
          style={{ left: `${p(p75)}%`, width: `${p(max) - p(p75)}%` }}
        />

        {/* Tick P10 */}
        <div className="absolute top-[15%] h-[70%] w-px bg-muted-foreground/25" style={{ left: `${p(p10)}%` }} />
        {/* Tick P90 */}
        <div className="absolute top-[15%] h-[70%] w-px bg-muted-foreground/25" style={{ left: `${p(p90)}%` }} />

        {/* Extrêmes min / max */}
        <div className="absolute top-[15%] h-[70%] w-px bg-muted-foreground/60" style={{ left: `${p(min)}%` }} />
        <div className="absolute top-[15%] h-[70%] w-px bg-muted-foreground/60" style={{ left: `${p(max)}%` }} />

        {/* Boîte IQR */}
        <div
          className="absolute top-0 h-full rounded border border-indigo-400/50 bg-indigo-500/10 dark:bg-indigo-400/10"
          style={{ left: `${p(p25)}%`, width: `${p(p75) - p(p25)}%` }}
        />

        {/* Moyenne (tirets) */}
        <div
          className="absolute top-0 h-full border-l border-dashed border-indigo-400/60"
          style={{ left: `${p(average)}%` }}
        />

        {/* Médiane (plein) */}
        <div
          className="absolute top-0 h-full w-0.5 rounded-full bg-indigo-600"
          style={{ left: `${p(median)}%` }}
        />

        {/* Label min (au-dessus) */}
        <div
          className="absolute bottom-full mb-0.5 -translate-x-1/2 whitespace-nowrap text-[9px] tabular-nums text-muted-foreground"
          style={{ left: `${p(min)}%` }}
        >
          {formatPrice(min)}
        </div>

        {/* Label max (au-dessus) */}
        <div
          className="absolute bottom-full mb-0.5 -translate-x-1/2 whitespace-nowrap text-[9px] tabular-nums text-muted-foreground"
          style={{ left: `${p(max)}%` }}
        >
          {formatPrice(max)}
        </div>

        {/* Label médiane (en-dessous) */}
        <div
          className="absolute top-full mt-0.5 -translate-x-1/2 whitespace-nowrap text-[9px] font-semibold tabular-nums text-indigo-600"
          style={{ left: `${p(median)}%` }}
        >
          {formatPrice(median)}
        </div>
      </div>

      {/* Légende */}
      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-4 rounded-full bg-indigo-600" />
          Médiane
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-0.5 w-4"
            style={{ borderTop: '1.5px dashed rgba(99,102,241,0.6)' }}
          />
          Moyenne
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-4 rounded-sm border border-indigo-400/50 bg-indigo-500/10" />
          IQR (P25–P75)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-4 rounded-sm border border-dashed border-indigo-300/40 bg-indigo-500/5" />
          ±1σ
        </span>
      </div>
    </div>
  )
}
