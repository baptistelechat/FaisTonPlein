import type { AsyncDuckDB } from '@duckdb/duckdb-wasm'
import type { FuelType } from '@/lib/constants'

export type PriceHistoryPoint = { date: string; price: number | null }

const ROLLING_BASE_URL =
  'https://huggingface.co/datasets/baptistelechat/fais-ton-plein_dataset/resolve/main/data/rolling/30days'

export const fetchStationPriceHistory = async (
  db: AsyncDuckDB,
  stationId: string,
  dept: string,
  fuelType: FuelType,
): Promise<PriceHistoryPoint[]> => {
  const url = `${ROLLING_BASE_URL}/code_departement=${dept}/data_0.parquet`
  const fuelCol = `"Prix ${fuelType}"`

  // 1 fichier par dept, 1 ligne par (id, date) — pas de GROUP BY nécessaire
  const query = `
    SELECT date, ${fuelCol} AS price
    FROM read_parquet('${url}')
    WHERE CAST(id AS VARCHAR) = '${stationId}'
    ORDER BY date
  `

  const conn = await db.connect()
  let rows: PriceHistoryPoint[] = []
  try {
    const result = await conn.query(query)
    rows = result.toArray().map((r) => {
      const row = r.toJSON() as Record<string, unknown>
      const price = row.price != null ? Number(row.price) : null
      return { date: String(row.date), price: Number.isNaN(price ?? NaN) ? null : price }
    })
  } finally {
    await conn.close()
  }
  return rows
}
