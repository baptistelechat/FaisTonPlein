import type { AsyncDuckDB } from '@duckdb/duckdb-wasm'
import type { FuelType } from '@/lib/constants'
import type { Station } from '@/store/useAppStore'

export type TrendDirection = 'up' | 'down' | 'stable'

const TREND_THRESHOLD = 0.01

const BASE_URL =
  'https://huggingface.co/datasets/baptistelechat/fais-ton-plein_dataset/resolve/main/data/consolidated/daily'

export const buildTrendKey = (stationId: string, fuelType: FuelType): string =>
  `${stationId}_${fuelType}`

const getDeptFromStationId = (stationId: string): string => {
  const s = String(stationId)
  if (/^97[1-6]/.test(s)) return s.slice(0, 3) // DOM-TOM: 971–976
  return s.slice(0, 2) // Métropole + Corse (2A, 2B)
}

export const getLast7DayUrls = (dept: string): string[] => {
  const urls: string[] = []
  const now = new Date()
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    urls.push(
      `${BASE_URL}/year=${year}/month=${month}/day=${day}/code_departement=${dept}/data_0.parquet`,
    )
  }
  return urls
}

const FUEL_COLUMN_MAP: Record<FuelType, string> = {
  Gazole: '"Prix Gazole"',
  E10: '"Prix E10"',
  SP95: '"Prix SP95"',
  SP98: '"Prix SP98"',
  E85: '"Prix E85"',
  GPLc: '"Prix GPLc"',
}

export const fetchPriceTrends = async (
  db: AsyncDuckDB,
  stations: Station[],
): Promise<Record<string, TrendDirection>> => {
  // Dériver les départements uniques depuis les IDs des stations
  // (ex: "44190001" → "44", "85690001" → "85")
  const depts = [...new Set(stations.map((s) => getDeptFromStationId(s.id)))]

  // Récupérer les URLs disponibles pour tous les départements en parallèle
  const urlsPerDept = await Promise.all(
    depts.map(async (dept) => {
      const urls = getLast7DayUrls(dept)
      return filterAvailableUrls(urls)
    }),
  )

  const availableUrls = urlsPerDept.flat()
  if (availableUrls.length === 0) return {}

  const urlList = availableUrls.map((u) => `'${u}'`).join(', ')

  const query = `
    SELECT
      id,
      AVG("Prix Gazole") AS avg_gazole,
      AVG("Prix E10") AS avg_e10,
      AVG("Prix SP95") AS avg_sp95,
      AVG("Prix SP98") AS avg_sp98,
      AVG("Prix E85") AS avg_e85,
      AVG("Prix GPLc") AS avg_gplc
    FROM read_parquet([${urlList}])
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
  const fuelTypes = Object.keys(FUEL_COLUMN_MAP) as FuelType[]

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

async function filterAvailableUrls(urls: string[]): Promise<string[]> {
  const results = await Promise.allSettled(
    urls.map((url) =>
      fetch(url, { method: 'HEAD' }).then((r) => (r.ok ? url : null)),
    ),
  )
  return results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && r.value !== null)
    .map((r) => r.value)
}
