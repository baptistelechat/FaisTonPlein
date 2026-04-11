import type { AsyncDuckDB } from "@duckdb/duckdb-wasm";
import type { FuelType } from "@/lib/constants";

export type PriceHistoryPoint = { date: string; price: number | null };

const ROLLING_BASE_URL =
  "https://huggingface.co/datasets/baptistelechat/fais-ton-plein_dataset/resolve/main/data/rolling/30days";

export const fetchStationPriceHistory = async (
  db: AsyncDuckDB,
  stationId: string,
  dept: string,
  fuelType: FuelType,
): Promise<PriceHistoryPoint[]> => {
  const today = new Date().toISOString().slice(0, 10);
  const safeId = String(stationId).replace(/[^0-9]/g, "");
  const safeDept = String(dept).replace(/[^a-zA-Z0-9]/g, "");
  const url = `${ROLLING_BASE_URL}/code_departement=${safeDept}/data_0.parquet?v=${today}`;
  const fuelCol = `"Prix ${fuelType}"`;

  // GROUP BY date calendrier pour éliminer les doublons intra-journaliers (plusieurs relevés/jour)
  const query = `
    SELECT
      CAST(date AS DATE)::VARCHAR AS date,
      ARG_MAX(${fuelCol}, date) AS price
    FROM read_parquet('${url}')
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
