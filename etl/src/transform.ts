import { Database } from "duckdb";
import fs from "fs";
import path from "path";
import { CSV_URL, HF_REPO, OUTPUT_DIR } from "./config";
import { runSQL } from "./db";

export const CSV_TEMP_PATH = path.join(process.cwd(), "temp_fuel_prices.csv");

async function downloadCSV(): Promise<void> {
  console.log("📥 Downloading CSV via fetch...");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  let response: Response;
  try {
    response = await fetch(CSV_URL, {
      signal: controller.signal,
      headers: { "User-Agent": "FaisTonPlein-ETL/1.0" },
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} ${response.statusText} — ${CSV_URL}`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (
    !contentType.includes("text") &&
    !contentType.includes("csv") &&
    !contentType.includes("octet")
  ) {
    throw new Error(`Unexpected content-type: ${contentType} (expected CSV)`);
  }

  const text = await response.text();
  if (text.trim().length === 0) {
    throw new Error("Empty response from CSV endpoint");
  }

  fs.writeFileSync(CSV_TEMP_PATH, text, "utf-8");
  console.log(`✅ CSV downloaded (${(text.length / 1024).toFixed(0)} KB)`);
}

export async function processFuelData(db: Database) {
  await downloadCSV();

  console.log("📊 Parsing CSV with DuckDB...");
  await runSQL(
    db,
    `CREATE OR REPLACE TABLE fuel_prices AS SELECT * FROM read_csv('${CSV_TEMP_PATH}', delim=';', header=true, quote='"', escape='"');`,
  );

  // Clean output dir
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(OUTPUT_DIR);

  // Write to Parquet partitioned in two ways:
  // 1. "latest": Partitioned by Department only (for the App) -> Fast access, always up to date.
  // 2. "history": Partitioned by Date/Time (for Analytics) -> Archival, keeps history.
  console.log("📦 Writing partitioned Parquet files...");

  // Add timestamp columns for partitioning
  await runSQL(
    db,
    `
      CREATE OR REPLACE TABLE fuel_prices_partitioned AS
      SELECT
          *,
          strftime(now(), '%Y') as year,
          strftime(now(), '%m') as month,
          strftime(now(), '%d') as day,
          strftime(now(), '%H') as hour,
          now() as extraction_date
      FROM fuel_prices
      WHERE code_departement IS NOT NULL;
  `,
  );

  // Free memory: drop the raw table now that fuel_prices_partitioned is ready
  await runSQL(db, "DROP TABLE fuel_prices;");

  // 1. LATEST (For App Client)
  // Overwrites the file for each department, so the URL is stable.
  console.log("   -> Generating 'latest' (by department)...");
  await runSQL(
    db,
    `COPY fuel_prices_partitioned TO '${path.join(OUTPUT_DIR, "latest")}' (FORMAT PARQUET, PARTITION_BY (code_departement), OVERWRITE_OR_IGNORE);`,
  );

  // Global metadata.json à la racine de latest/ (stats France entière + last_updated)
  console.log("   -> Generating global metadata.json...");
  const latestDir = path.join(OUTPUT_DIR, "latest");
  const now = new Date().toISOString();

  // Count total distinct stations before writing metadata
  const countRows = await new Promise<{ total: number }[]>(
    (resolve, reject) => {
      db.all(
        "SELECT COUNT(DISTINCT id) AS total FROM fuel_prices_partitioned",
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows as { total: number }[]);
        },
      );
    },
  );
  const totalStations = Number(countRows[0]?.total ?? 0);

  // Moyennes nationales par carburant + historique glissant sur 30 jours.
  // Alimente l'og:image dynamique (src/app/opengraph-image.tsx) : chaque partage du
  // lien affiche les prix du moment au lieu d'une image figée.
  const FUEL_KEYS = ["Gazole", "E10", "SP95", "SP98", "E85", "GPLc"] as const;

  // BETWEEN 0.3 AND 5 : garde-fou contre les relevés aberrants du flux data.gouv
  // (0 €, prix saisis en centimes, fautes de frappe) qui tireraient la moyenne.
  const statsSQL = FUEL_KEYS.map(
    (fuel) =>
      `ROUND(AVG(CASE WHEN "Prix ${fuel}" BETWEEN 0.3 AND 5 THEN "Prix ${fuel}" END), 3) AS "avg_${fuel}", ` +
      `COUNT(CASE WHEN "Prix ${fuel}" BETWEEN 0.3 AND 5 THEN 1 END) AS "n_${fuel}"`,
  ).join(", ");

  const statRows = await new Promise<Record<string, number | null>[]>(
    (resolve, reject) => {
      db.all(`SELECT ${statsSQL} FROM fuel_prices_partitioned`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Record<string, number | null>[]);
      });
    },
  );
  const stats = statRows[0] ?? {};

  const fuelStats: Record<string, { avg: number | null; stations: number }> =
    {};
  const todayPoint: Record<string, string | number> = {
    date: now.slice(0, 10),
  };
  for (const fuel of FUEL_KEYS) {
    const avg = stats[`avg_${fuel}`];
    fuelStats[fuel] = {
      avg: avg == null ? null : Number(avg),
      stations: Number(stats[`n_${fuel}`] ?? 0),
    };
    if (avg != null) todayPoint[fuel] = Number(avg);
  }

  // L'historique repart du metadata.json du run précédent (déjà publié sur HF).
  // Un point par jour : les runs suivants d'une même journée écrasent le point du jour,
  // sinon le cron 2h en empilerait 12 et 30 entrées ne couvriraient que 2,5 jours.
  let fuelHistory: Record<string, string | number>[] = [];
  if (HF_REPO) {
    try {
      const prev = await fetch(
        `https://huggingface.co/datasets/${HF_REPO}/resolve/main/data/latest/metadata.json`,
        { signal: AbortSignal.timeout(15_000) },
      );
      if (prev.ok) {
        const parsed = (await prev.json()) as { fuel_history?: unknown };
        if (Array.isArray(parsed.fuel_history)) {
          fuelHistory = parsed.fuel_history as Record<
            string,
            string | number
          >[];
        }
      }
    } catch {
      // Non bloquant : un historique perdu se reconstruit au fil des runs.
      console.warn(
        "   -> metadata.json précédent illisible, historique repart de zéro",
      );
    }
  }
  fuelHistory = [
    ...fuelHistory.filter((p) => p.date !== todayPoint.date),
    todayPoint,
  ]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(-30);

  fs.writeFileSync(
    path.join(latestDir, "metadata.json"),
    JSON.stringify(
      {
        total_stations: totalStations,
        france_area_km2: 543000,
        last_updated: now,
        source: "data.economie.gouv.fr",
        fuel_stats: fuelStats,
        fuel_history: fuelHistory,
      },
      null,
      2,
    ),
  );
  console.log(
    `   -> Moyennes nationales : ${FUEL_KEYS.map((f) => `${f} ${fuelStats[f].avg ?? "—"}`).join(" · ")}`,
  );
  console.log(`   -> Historique : ${fuelHistory.length} jour(s)`);
  console.log(`   -> Total stations (France) : ${totalStations}`);

  // 2. HISTORY (For Analytics/Backup)
  // Creates new folders for each hour, preserving history in the repo.
  console.log("   -> Generating 'history' (by date/hour)...");
  await runSQL(
    db,
    `COPY fuel_prices_partitioned TO '${path.join(OUTPUT_DIR, "history")}' (FORMAT PARQUET, PARTITION_BY (year, month, day, hour, code_departement), OVERWRITE_OR_IGNORE);`,
  );
}
