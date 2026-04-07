'use client'

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BrandStat } from '../helpers/brandExtraction'

// Primary = oklch(0.511 0.262 276.966) — Indigo-600
// Génère un dégradé du plus foncé (moins cher) au plus clair (plus cher)
function getPrimaryOklchShades(n: number): string[] {
  if (n === 0) return []
  if (n === 1) return ['oklch(0.511 0.262 276.966)']
  return Array.from({ length: n }, (_, i) => {
    const l = 0.30 + (i * 0.38 / (n - 1))
    return `oklch(${l.toFixed(3)} 0.262 276.966)`
  })
}

interface BrandPriceChartProps {
  brands: BrandStat[]
}

export function BrandPriceChart({ brands }: BrandPriceChartProps) {
  if (brands.length === 0) return null
  const sorted = [...brands].sort((a, b) => a.avgPrice - b.avgPrice)
  const shades = getPrimaryOklchShades(sorted.length)
  const prices = sorted.map((b) => b.avgPrice)
  const domain: [number, number] = [
    Math.floor((Math.min(...prices) - 0.05) * 100) / 100,
    Math.ceil((Math.max(...prices) + 0.05) * 100) / 100,
  ]

  return (
    <ResponsiveContainer width="100%" height={sorted.length * 44 + 20}>
      <BarChart layout="vertical" data={sorted} margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
        <XAxis
          type="number"
          domain={domain}
          tickFormatter={(v: number) => `${v.toFixed(2)}€`}
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={90}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value: unknown) => [`${Number(value).toFixed(3)} €/L`, 'Prix moyen']}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="avgPrice" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {sorted.map((_, i) => (
            <Cell key={i} fill={shades[i]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
