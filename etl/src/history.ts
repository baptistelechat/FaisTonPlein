import { Database } from "duckdb";
import { HF_REPO } from "./config";

export const FUEL_KEYS = [
  "Gazole",
  "E10",
  "SP95",
  "SP98",
  "E85",
  "GPLc",
] as const;

const ROLLING_PREFIX = "data/rolling/30days";
const HISTORY_DAYS = 30;

async function listRollingFiles(): Promise<string[]> {
  const res = await fetch(
    `https://huggingface.co/api/datasets/${HF_REPO}/tree/main/${ROLLING_PREFIX}?recursive=true`,
    { signal: AbortSignal.timeout(60_000) },
  );
  if (!res.ok) throw new Error(`Listing HF échoué : HTTP ${res.status}`);
  const entries = (await res.json()) as { type: string; path: string }[];
  return entries
    .filter((e) => e.type === "file" && e.path.endsWith(".parquet"))
    .map(
      (e) =>
        `https://huggingface.co/datasets/${HF_REPO}/resolve/main/${e.path}`,
    );
}

/**
 * Reconstruit fuel_history (moyennes nationales par jour) depuis les Parquet
 * rolling/30days publiés sur Hugging Face. Utilisé par bootstrap-og-history.ts
 * (manuel) et par transform.ts en secours quand le fuel_history du run
 * précédent est illisible — voir BLK-010 en mémoire projet.
 */
export async function reconstructFuelHistory(
  db: Database,
): Promise<Record<string, string | number>[]> {
  const urls = await listRollingFiles();
  if (urls.length === 0) return [];

  // Même garde-fou que transform.ts : les relevés hors [0.3, 5] € sont des
  // erreurs de saisie du flux data.gouv et décaleraient la moyenne nationale.
  const avgCols = FUEL_KEYS.map(
    (f) =>
      `ROUND(AVG(CASE WHEN "Prix ${f}" BETWEEN 0.3 AND 5 THEN "Prix ${f}" END), 3) AS "${f}"`,
  ).join(", ");
  const fileList = urls.map((u) => `'${u}'`).join(", ");

  const rows = await new Promise<Record<string, unknown>[]>(
    (resolve, reject) => {
      db.all(
        `SELECT date, ${avgCols}
         FROM read_parquet([${fileList}], union_by_name=true)
         WHERE date IS NOT NULL
         GROUP BY date
         ORDER BY date`,
        (err, r) =>
          err ? reject(err) : resolve(r as Record<string, unknown>[]),
      );
    },
  );

  return rows
    .map((r) => {
      const point: Record<string, string | number> = { date: String(r.date) };
      for (const fuel of FUEL_KEYS) {
        const v = r[fuel];
        if (v != null) point[fuel] = Number(v);
      }
      return point;
    })
    .filter((p) => Object.keys(p).length > 1)
    .slice(-HISTORY_DAYS);
}
