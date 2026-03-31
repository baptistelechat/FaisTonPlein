import { FuelStats } from '@/store/useAppStore'

export type PriceLevel = 'good' | 'neutral' | 'bad'

const PRICE_LEVEL_TEXT_COLORS: Record<PriceLevel, string> = {
  good: 'text-emerald-600',
  neutral: 'text-amber-600',
  bad: 'text-rose-600',
}

const PRICE_LEVEL_MARKER_CLASSES: Record<PriceLevel, string> = {
  good: 'text-emerald-600 border-emerald-500 bg-emerald-50',
  neutral: 'text-amber-600 border-amber-500 bg-amber-50',
  bad: 'text-rose-600 border-rose-500 bg-rose-50',
}

/**
 * Retourne le niveau relatif d'un prix selon les quartiles des stations filtrées.
 * - good    : prix <= p25 (bas du marché)
 * - bad     : prix >= p75 (haut du marché)
 * - neutral : entre les deux
 */
export const getPriceLevel = (
  price: number,
  stats: FuelStats | null,
): PriceLevel | null => {
  if (!stats) return null
  if (price <= stats.p25) return 'good'
  if (price >= stats.p75) return 'bad'
  return 'neutral'
}

/**
 * Retourne la classe Tailwind de couleur de texte pour un prix
 * selon les quartiles des stations filtrées (rayon + autoroute).
 */
export const getPriceTextColor = (
  price: number,
  stats: FuelStats | null,
): string => {
  const level = getPriceLevel(price, stats)
  if (!level) return 'text-foreground'
  return PRICE_LEVEL_TEXT_COLORS[level]
}

/**
 * Retourne les classes Tailwind complètes (texte + bordure + fond)
 * pour les marqueurs de prix sur la carte.
 */
export const getPriceMarkerClasses = (
  price: number,
  stats: FuelStats | null,
): string => {
  const level = getPriceLevel(price, stats)
  if (!level) return PRICE_LEVEL_MARKER_CLASSES.neutral
  return PRICE_LEVEL_MARKER_CLASSES[level]
}

