import { FuelType } from '@/lib/constants'
import { normalizeBrand } from '@/lib/brandMapping'
import { Station } from '@/store/useAppStore'

export interface BrandStat {
  name: string
  count: number
  avgPrice: number
  isGMS: boolean
}

// Enseignes grande distribution (prix généralement plus bas)
const GMS_BRANDS = new Set([
  'E.Leclerc', 'Intermarché', 'Carrefour', 'Auchan', 'Système U',
  'Casino', 'Leader Price', 'Lidl', 'Aldi', 'Netto', 'Match',
  'Monoprix', 'Cora', 'Costco', 'Bi1', 'CocciMarket', 'Proxi', 'Spar',
])

export function isGMSBrand(brand: string): boolean {
  return GMS_BRANDS.has(brand)
}

export function computeBrandStats(
  stations: Station[],
  selectedFuel: FuelType,
  stationNames: Record<string, string>,
): BrandStat[] {
  const map = new Map<string, { count: number; totalPrice: number; isGMS: boolean }>()

  for (const station of stations) {
    const price = station.prices.find((p) => p.fuel_type === selectedFuel)?.price
    if (price === undefined) continue

    const rawName = stationNames[station.id] ?? ''
    const brand = normalizeBrand(rawName) ?? 'Indépendant'
    const isGMS = isGMSBrand(brand)
    const existing = map.get(brand) ?? { count: 0, totalPrice: 0, isGMS }
    map.set(brand, { count: existing.count + 1, totalPrice: existing.totalPrice + price, isGMS })
  }

  return Array.from(map.entries())
    .map(([name, { count, totalPrice, isGMS }]) => ({
      name,
      count,
      avgPrice: totalPrice / count,
      isGMS,
    }))
    .sort((a, b) => b.count - a.count)
}
