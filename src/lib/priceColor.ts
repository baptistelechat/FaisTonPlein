import { FuelStats } from '@/store/useAppStore'

/**
 * Retourne la classe Tailwind de couleur de texte pour un prix
 * selon les quartiles des stations filtrées (rayon + autoroute).
 * - vert  : prix <= p25 (bas du marché)
 * - rouge : prix >= p75 (haut du marché)
 * - orange : entre les deux
 */
export const getPriceTextColor = (
  price: number,
  stats: FuelStats | null,
): string => {
  if (!stats) return 'text-foreground'
  if (price <= stats.p25) return 'text-emerald-600'
  if (price >= stats.p75) return 'text-rose-600'
  return 'text-amber-600'
}

/**
 * Retourne les classes Tailwind complètes (texte + bordure + fond)
 * pour les marqueurs de prix sur la carte.
 */
export const getPriceMarkerClasses = (
  price: number,
  stats: FuelStats | null,
): string => {
  if (!stats) return 'text-amber-600 border-amber-500 bg-amber-50'
  if (price <= stats.p25) return 'text-emerald-600 border-emerald-500 bg-emerald-50'
  if (price >= stats.p75) return 'text-rose-600 border-rose-500 bg-rose-50'
  return 'text-amber-600 border-amber-500 bg-amber-50'
}

