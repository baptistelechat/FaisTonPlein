import type { AsyncDuckDB } from '@duckdb/duckdb-wasm'
import { FUEL_TYPES } from '@/lib/constants'
import type { FuelType } from '@/lib/constants'
import type { Station } from '@/store/useAppStore'

export type TrendDirection = 'up' | 'down' | 'stable'

const TREND_THRESHOLD = 0.01

const ROLLING_BASE_URL =
  'https://huggingface.co/datasets/baptistelechat/fais-ton-plein_dataset/resolve/main/data/rolling/30days'

export const buildTrendKey = (stationId: string, fuelType: FuelType): string =>
  `${stationId}_${fuelType}`

export const getDeptFromStationId = (stationId: string): string => {
  const s = String(stationId)
  if (/^97[1-6]/.test(s)) return s.slice(0, 3) // DOM-TOM: 971–976
  if (/^2[AB]/i.test(s)) return s.slice(0, 2)  // Corse : "2A..." → "2A", "2B..." → "2B"
  return s.slice(0, 2)                           // Métropole
}

export const fetchPriceTrends = async (
  db: AsyncDuckDB,
  stations: Station[],
): Promise<Record<string, TrendDirection>> => {
  const depts = [...new Set(stations.map((s) => getDeptFromStationId(s.id)))]

  // 1 fichier rolling par département — filtre les 7 derniers jours
  const urlList = depts
    .map((dept) => `'${ROLLING_BASE_URL}/code_departement=${dept}/data_0.parquet'`)
    .join(', ')

  const query = `
    SELECT
      id,
      AVG("Prix Gazole") AS avg_gazole,
      AVG("Prix E10")    AS avg_e10,
      AVG("Prix SP95")   AS avg_sp95,
      AVG("Prix SP98")   AS avg_sp98,
      AVG("Prix E85")    AS avg_e85,
      AVG("Prix GPLc")   AS avg_gplc
    FROM read_parquet([${urlList}])
    WHERE CAST(date AS DATE) >= CURRENT_DATE - INTERVAL 7 DAYS
    GROUP BY id
  `

  const conn = await db.connect()
  let rows: Record<string, unknown>[] = []
  try {
    const result = await conn.query(query)
    rows = result.toArray().map((r) => r.toJSON())
  } finally {
    await conn.close()
  }

  const avgMap = new Map<string, Record<string, number | null>>()
  for (const row of rows) {
    const toNum = (v: unknown): number | null => {
      if (v == null) return null
      const n = Number(v)
      return isNaN(n) ? null : n
    }
    avgMap.set(String(row.id), {
      Gazole: toNum(row.avg_gazole),
      E10: toNum(row.avg_e10),
      SP95: toNum(row.avg_sp95),
      SP98: toNum(row.avg_sp98),
      E85: toNum(row.avg_e85),
      GPLc: toNum(row.avg_gplc),
    })
  }

  const trends: Record<string, TrendDirection> = {}
  const fuelTypes = FUEL_TYPES.map((f) => f.type)

  for (const station of stations) {
    const historicEntry = avgMap.get(String(station.id))
    if (!historicEntry) continue

    for (const fuelType of fuelTypes) {
      const currentPriceEntry = station.prices.find((p) => p.fuel_type === fuelType)
      if (!currentPriceEntry) continue

      const avg7d = historicEntry[fuelType]
      if (avg7d === null || avg7d === undefined) continue

      const currentPrice = currentPriceEntry.price
      const key = buildTrendKey(station.id, fuelType)

      if (currentPrice > avg7d * (1 + TREND_THRESHOLD)) {
        trends[key] = 'up'
      } else if (currentPrice < avg7d * (1 - TREND_THRESHOLD)) {
        trends[key] = 'down'
      } else {
        trends[key] = 'stable'
      }
    }
  }

  return trends
}
