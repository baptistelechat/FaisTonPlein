import type { AsyncDuckDB } from '@duckdb/duckdb-wasm'
import type { FuelType } from '@/lib/constants'
import type { Station } from '@/store/useAppStore'

export type TrendDirection = 'up' | 'down' | 'stable'

const TREND_THRESHOLD = 0.01

const BASE_URL =
  'https://huggingface.co/datasets/baptistelechat/fais-ton-plein_dataset/resolve/main/data/consolidated/daily'

export const buildTrendKey = (stationId: string, fuelType: FuelType): string =>
  `${stationId}_${fuelType}`

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
  dept: string,
): Promise<Record<string, TrendDirection>> => {
  const urls = getLast7DayUrls(dept)

  // Filtrer les URLs inaccessibles pour éviter les erreurs DuckDB
  const availableUrls = await filterAvailableUrls(urls)

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
    avgMap.set(String(row.id), {
      Gazole: typeof row.avg_gazole === 'number' ? row.avg_gazole : null,
      E10: typeof row.avg_e10 === 'number' ? row.avg_e10 : null,
      SP95: typeof row.avg_sp95 === 'number' ? row.avg_sp95 : null,
      SP98: typeof row.avg_sp98 === 'number' ? row.avg_sp98 : null,
      E85: typeof row.avg_e85 === 'number' ? row.avg_e85 : null,
      GPLc: typeof row.avg_gplc === 'number' ? row.avg_gplc : null,
    })
  }

  const trends: Record<string, TrendDirection> = {}
  const fuelTypes = Object.keys(FUEL_COLUMN_MAP) as FuelType[]

  for (const station of stations) {
    const historicEntry = avgMap.get(station.id)
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
