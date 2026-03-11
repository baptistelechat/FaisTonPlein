import { createRepo, uploadFiles } from "@huggingface/hub";
import chalk from "chalk";
import dotenv from "dotenv";
import { Database } from "duckdb";
import fs from "fs";
import cron from "node-cron";
import path from "path";

dotenv.config();

const HF_TOKEN = process.env.HF_TOKEN;
const HF_REPO = process.env.HF_REPO; // e.g., "username/fuel-prices-france"
const CSV_URL =
  "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/exports/csv?use_labels=true";
const OUTPUT_DIR = path.join(__dirname, "data");

// Helper to run SQL
function runSQL(db: Database, sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function ensureRepoExists() {
  if (!HF_TOKEN || !HF_REPO) return;
  try {
    console.log(chalk.blue(`🔍 Checking if repo ${HF_REPO} exists...`));
    // Try to create it; if it exists, it might throw or return existing (depending on API, but createRepo usually throws if exists)
    // Actually, createRepo throws if it exists. So we catch that specific error.
    await createRepo({
      repo: { type: "dataset", name: HF_REPO },
      credentials: { accessToken: HF_TOKEN },
      private: false, // Public by default
    });
    console.log(chalk.green(`✅ Repo ${HF_REPO} created.`));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // If error is "repo already exists", we ignore it.
    // The error message from HF hub usually contains "409" or "already exists"
    const errorMsg = error?.message || String(error);
    if (errorMsg.includes("409") || errorMsg.includes("exists")) {
      console.log(
        chalk.green(`✅ Repo ${HF_REPO} already exists (or access confirmed).`),
      );
    } else {
      console.warn(
        chalk.yellow(
          `⚠️ Warning: Could not create repo (might already exist or permission issue): ${errorMsg}`,
        ),
      );
    }
  }
}

async function runETL() {
  const now = new Date().toISOString();
  console.log(chalk.blue(`🚀 [${now}] Starting ETL job...`));

  if (!HF_TOKEN || !HF_REPO) {
    console.error(chalk.red("❌ Missing HF_TOKEN or HF_REPO in .env"));
    return;
  }

  // Ensure repo exists before processing
  await ensureRepoExists();

  // Set environment variables that DuckDB might use
  const localHome = path.join(__dirname, "duckdb_home");
  if (!fs.existsSync(localHome)) {
    fs.mkdirSync(localHome, { recursive: true });
  }

  // DUCKDB_NO_EXTENSIONS_LOADING might be too strict, but we can try to force local path
  // It seems setting HOME env var is the most reliable way to trick DuckDB on Windows
  // when it fails to access the real user home.
  process.env.HOME = localHome;
  process.env.USERPROFILE = localHome;

  const db = new Database(":memory:", {
    allow_unsigned_extensions: "true",
  });

  try {
    // Install httpfs extension for fetching remote CSV
    await runSQL(db, "INSTALL httpfs; LOAD httpfs;");

    // Create table from CSV
    // We select specific columns to ensure clean schema if needed, but SELECT * is fine for now
    console.log("📥 Downloading and parsing CSV...");
    await runSQL(
      db,
      `CREATE OR REPLACE TABLE fuel_prices AS SELECT * FROM read_csv_auto('${CSV_URL}');`,
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
    if (fs.existsSync(latestDir)) {
      const deptDirs = fs.readdirSync(latestDir, { withFileTypes: true });
      for (const entry of deptDirs) {
        if (entry.isDirectory() && entry.name.startsWith("code_departement=")) {
          const deptPath = path.join(latestDir, entry.name);
          const metadata = {
            last_updated: now,
            source: "data.economie.gouv.fr",
            // We could add more stats here by querying DuckDB if needed
          };
          fs.writeFileSync(
            path.join(deptPath, "metadata.json"),
            JSON.stringify(metadata, null, 2),
          );
        }
      }
    }

    // 2. HISTORY (For Analytics/Backup)
    // Creates new folders for each hour, preserving history in the repo.
    console.log("   -> Generating 'history' (by date/hour)...");
    await runSQL(
      db,
      `COPY fuel_prices_partitioned TO '${path.join(OUTPUT_DIR, "history")}' (FORMAT PARQUET, PARTITION_BY (year, month, day, hour, code_departement), OVERWRITE_OR_IGNORE);`,
    );

    // Upload to HF
    console.log(`⬆️ Uploading to Hugging Face (${HF_REPO})...`);

    // Prepare files for upload
    const filesToUpload: { path: string; content: Blob }[] = [];

    function scanDir(dir: string, baseDir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        // Ensure path uses forward slashes for HF
        const relPath = path.relative(baseDir, fullPath).replace(/\\/g, "/");

        if (entry.isDirectory()) {
          scanDir(fullPath, baseDir);
        } else {
          // Adjust path to keep 'latest' or 'history' at root of dataset
          // OUTPUT_DIR is 'data', so relPath will be 'latest/...' or 'history/...'
          filesToUpload.push({
            path: `data/${relPath}`,
            content: new Blob([fs.readFileSync(fullPath)]),
          });
        }
      }
    }

    scanDir(OUTPUT_DIR, OUTPUT_DIR);

    if (filesToUpload.length === 0) {
      console.log(chalk.yellow("⚠️ No files generated."));
    } else {
      console.log(
        chalk.green(`✅ Found ${filesToUpload.length} files to upload.`),
      );
      await uploadFiles({
        repo: { type: "dataset", name: HF_REPO },
        credentials: { accessToken: HF_TOKEN },
        files: filesToUpload,
        commitTitle: `Update fuel prices ${new Date().toISOString()}`,
      });
      console.log(
        chalk.green(
          `🎉 [${new Date().toISOString()}] ETL job completed successfully.`,
        ),
      );

      // Cleanup: Remove local data directory after successful upload to save space
      console.log(chalk.gray("🧹 Cleaning up local data..."));
      fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    }

    // Log execution
    console.log(
      chalk.magenta(
        `⏳ Next execution will be handled by CRON schedule: ${CRON_SCHEDULE}`,
      ),
    );
  } catch (error) {
    console.error(
      chalk.red(`❌ [${new Date().toISOString()}] ETL job failed:`),
      error,
    );
  } finally {
    // Close DB connection
    db.close();
  }
}

// Default schedule: Every hour at minute 0
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || "0 * * * *";

console.log(chalk.bgBlue("⛽ Fais Ton Plein - ETL Service started."));
console.log(chalk.gray(`- Schedule: ${CRON_SCHEDULE}`));
console.log(chalk.gray(`- CSV Source: ${CSV_URL}`));
console.log(chalk.gray(`- HF Repo: ${HF_REPO}`));

// Run immediately on start
runETL();

// Schedule cron
cron.schedule(CRON_SCHEDULE, async () => {
  await runETL();
});
