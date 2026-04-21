import type { AsyncDuckDB } from "@duckdb/duckdb-wasm";
import type { FuelType } from "@/lib/constants";
import { getRollingParquetSource } from "@/lib/deptCache";

export type PriceHistoryPoint = { date: string; price: number | null };

export const fetchStationPriceHistory = async (
  db: AsyncDuckDB,
  stationId: string,
  dept: string,
  fuelType: FuelType,
): Promise<PriceHistoryPoint[]> => {
  const today = new Date().toISOString().slice(0, 10);
  const safeId = String(stationId).replace(/[^0-9]/g, "");
  const safeDept = String(dept).replace(/[^a-zA-Z0-9]/g, "");
  const baseSrc = await getRollingParquetSource(db, safeDept);
  // Cache-busting uniquement pour les URL HF (pas pour les fichiers locaux DuckDB)
  const src = baseSrc.startsWith("http") ? `${baseSrc}?v=${today}` : baseSrc;
  const fuelCol = `"Prix ${fuelType}"`;

  // GROUP BY date calendrier pour éliminer les doublons intra-journaliers (plusieurs relevés/jour)
  const query = `
    SELECT
      CAST(date AS DATE)::VARCHAR AS date,
      ARG_MAX(${fuelCol}, date) AS price
    FROM read_parquet('${src}')
    WHERE CAST(id AS VARCHAR) = '${safeId}'
    GROUP BY CAST(date AS DATE)
    ORDER BY CAST(date AS DATE)
  `;

  const conn = await db.connect();
  let rows: PriceHistoryPoint[] = [];
  try {
    const result = await conn.query(query);
    rows = result.toArray().map((r) => {
      const row = r.toJSON() as Record<string, unknown>;
      const price = row.price != null ? Number(row.price) : null;
      return {
        date: String(row.date),
        price: Number.isNaN(price ?? NaN) ? null : price,
      };
    });
  } finally {
    await conn.close();
  }
  return rows;
};
