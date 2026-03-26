import { formatRelative } from 'date-fns'
import { fr } from 'date-fns/locale'

export type FreshnessLevel = 'fresh' | 'moderate' | 'stale'

function toTimestamp(updatedAt: unknown): number {
  if (updatedAt instanceof Date) return updatedAt.getTime()
  if (typeof updatedAt === 'number') return updatedAt
  if (typeof updatedAt === 'string') return Date.parse(updatedAt.replace(' ', 'T'))
  return NaN
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function getPriceFreshness(updatedAt: unknown): FreshnessLevel {
  const updatedMs = toTimestamp(updatedAt)
  if (isNaN(updatedMs)) return 'stale'
  const ageHours = (Date.now() - updatedMs) / (1000 * 60 * 60)
  if (ageHours < 24) return 'fresh'
  if (ageHours < 72) return 'moderate'
  return 'stale'
}

export function formatPriceAge(updatedAt: unknown): string | null {
  const updatedMs = toTimestamp(updatedAt)
  if (isNaN(updatedMs)) return null
  return capitalize(formatRelative(new Date(updatedMs), new Date(), { locale: fr }))
}

export const FRESHNESS_DOT_COLORS: Record<FreshnessLevel, string> = {
  fresh: 'bg-emerald-500',
  moderate: 'bg-amber-500',
  stale: 'bg-rose-500',
}

export const FRESHNESS_TEXT_COLORS: Record<FreshnessLevel, string> = {
  fresh: 'text-emerald-500',
  moderate: 'text-amber-500',
  stale: 'text-rose-500',
}
