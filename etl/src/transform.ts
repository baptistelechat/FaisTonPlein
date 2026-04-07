import { Database } from "duckdb";
import fs from "fs";
import path from "path";
import { CSV_URL, OUTPUT_DIR } from "./config";
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
    throw new Error(`HTTP ${response.status} ${response.statusText} — ${CSV_URL}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text") && !contentType.includes("csv") && !contentType.includes("octet")) {
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

  // Generate metadata.json for each department in "latest"
  console.log("   -> Generating metadata.json for each department...");
  const latestDir = path.join(OUTPUT_DIR, "latest");
  const now = new Date().toISOString();

  // Count total distinct stations before writing metadata
  const countRows = await new Promise<{ total: number }[]>((resolve, reject) => {
    db.all("SELECT COUNT(DISTINCT id) AS total FROM fuel_prices_partitioned", (err, rows) => {
      if (err) reject(err);
      else resolve(rows as { total: number }[]);
    });
  });
  const totalStations = Number(countRows[0]?.total ?? 0);

  if (fs.existsSync(latestDir)) {
    const deptDirs = fs.readdirSync(latestDir, { withFileTypes: true });
    for (const entry of deptDirs) {
      if (entry.isDirectory() && entry.name.startsWith("code_departement=")) {
        const deptPath = path.join(latestDir, entry.name);
        fs.writeFileSync(
          path.join(deptPath, "metadata.json"),
          JSON.stringify({ last_updated: now, source: "data.economie.gouv.fr" }, null, 2),
        );
      }
    }
  }

  // Global metadata.json à la racine de latest/ (stats France entière)
  console.log("   -> Generating global metadata.json...");
  fs.writeFileSync(
    path.join(latestDir, "metadata.json"),
    JSON.stringify(
      {
        total_stations: totalStations,
        france_area_km2: 543000,
        last_updated: now,
        source: "data.economie.gouv.fr",
      },
      null,
      2,
    ),
  );
  console.log(`   -> Total stations (France) : ${totalStations}`);

  // 2. HISTORY (For Analytics/Backup)
  // Creates new folders for each hour, preserving history in the repo.
  console.log("   -> Generating 'history' (by date/hour)...");
  await runSQL(
    db,
    `COPY fuel_prices_partitioned TO '${path.join(OUTPUT_DIR, "history")}' (FORMAT PARQUET, PARTITION_BY (year, month, day, hour, code_departement), OVERWRITE_OR_IGNORE);`,
  );

}
