'use client'

import { ReactNode } from 'react'

export interface StatRowProps {
  label: string
  value: string
  className?: string
  description?: ReactNode
  percentile?: number
}

export function StatRow({ label, value, className = 'text-slate-600', description, percentile }: StatRowProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">{label}</span>
        <span className={`font-mono font-bold ${className}`}>{value}</span>
      </div>
      {percentile !== undefined && (
        <div className="mt-0.5 flex items-center gap-2">
          <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
            <div
              className="bg-primary/60 h-full rounded-full transition-all"
              style={{ width: `${percentile}%` }}
            />
          </div>
          <span className="text-muted-foreground shrink-0 text-[10px] tabular-nums">{percentile}%</span>
        </div>
      )}
      {description && <p className="text-muted-foreground text-xs">{description}</p>}
    </div>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
      {children}
    </div>
  )
}
