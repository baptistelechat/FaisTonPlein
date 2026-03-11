import chalk from "chalk";
import { Database } from "duckdb";
import fs from "fs";
import path from "path";
import { HF_REPO, HF_TOKEN, OUTPUT_DIR } from "./config";
import { initDB, runSQL } from "./db";
import { listParquetFiles, uploadFilesWithRetry } from "./hf";

interface ConsolidationOptions {
  db: Database;
  hfToken: string;
  hfRepo: string;
  outputDir: string;
  targetDate?: Date; // Optional: Force consolidation for a specific date
}

export async function consolidateData({
  db,
  hfToken,
  hfRepo,
  outputDir,
  targetDate,
}: ConsolidationOptions) {
  const now = targetDate || new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  console.log(
    chalk.blue(
      `🔄 [${now.toISOString()}] Starting Consolidation (Target: ${year}-${month}-${day})...`,
    ),
  );

  // Ensure httpfs is loaded (should be already, but safe to check/load)
  try {
    // Attempt 1: SET s3_token (DuckDB uses s3_* configs for httpfs mostly, but hf:// protocol needs specific handling)
    // Actually, for hf:// filesystem, DuckDB uses the HF_TOKEN secret or config.
    // Let's try the modern SECRET syntax first as it is preferred.

    console.log(chalk.gray("   🔑 Configuring DuckDB for HF access..."));

    // NOTE: We need to escape single quotes in token just in case.
    const safeToken = hfToken.replace(/'/g, "''");

    // Try creating a secret (DuckDB 0.10.0+)
    // We use a specific name 'hf_auth' to avoid conflicts
    await runSQL(
      db,
      `CREATE OR REPLACE SECRET hf_auth (TYPE HUGGINGFACE, TOKEN '${safeToken}');`,
    );
    console.log(chalk.gray("   ✅ HF Secret created via CREATE SECRET"));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.warn(chalk.yellow(`⚠️  CREATE SECRET failed: ${err.message}`));

    // Fallback: Try setting variable directly (Older DuckDB or if Secret fails)
    try {
      // Note: "hf_token" parameter might not be recognized in some versions,
      // sometimes it is just passed via HTTP headers or s3_session_token if using S3 compatibility.
      // But 'hf://' usually relies on the secret.
      // Let's try 's3_access_key_id' and 's3_secret_access_key' if it was S3, but it's not.
      // Let's try the generic SET hf_token again but catch specifically.
      const safeToken = hfToken.replace(/'/g, "''");
      await runSQL(db, `SET hf_token='${safeToken}';`);
      console.log(chalk.gray("   ✅ HF Token set via SET hf_token"));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (fallbackErr: any) {
      console.error(
        chalk.red(
          `❌ Failed to set HF token via SET hf_token: ${fallbackErr.message}`,
        ),
      );

      // CRITICAL FAILURE
      // If we cannot authenticate, we cannot read/write private repos or high volume public data.
      // We must stop here.
      throw new Error(
        `CRITICAL: Failed to configure DuckDB HF authentication. \nSecret Error: ${err.message}\nFallback Error: ${fallbackErr.message}`,
      );
    }
  }

  // 1. Daily Consolidation
  // Consolidate hourly files for TODAY into a single daily partition
  console.log(chalk.blue(`   -> Consolidating Daily: ${year}-${month}-${day}`));
  console.log(
    chalk.gray(
      `      Scanning for source files (using HF API to avoid 429 errors)...`,
    ),
  );

  // Instead of globbing directly with DuckDB (which triggers many HEAD requests and 429s),
  // We list files via HF API first.
  const dailyPrefix = `data/history/year=${year}/month=${month}/day=${day}`;
  const dailyFiles = await listParquetFiles(hfRepo, hfToken, dailyPrefix);

  if (dailyFiles.length === 0) {
    console.log(
      chalk.yellow(
        `   ⚠️ No source files found for ${year}-${month}-${day} (skipping)`,
      ),
    );
  } else {
    console.log(
      chalk.gray(`      Found ${dailyFiles.length} files to consolidate.`),
    );
    const dailyDestPath = path.join(
      outputDir,
      "consolidated",
      "daily",
      `year=${year}`,
      `month=${month}`,
      `day=${day}`,
    );

    // Ensure destination parent dir exists
    fs.mkdirSync(path.dirname(dailyDestPath), { recursive: true });

    try {
      // Enable progress bar for long queries if possible (might not show in all terminals)
      await runSQL(db, "PRAGMA enable_progress_bar;");

      // Use read_parquet with list of files instead of glob
      // We need to format the list as a SQL array string: ['file1', 'file2', ...]
      const fileListSQL = dailyFiles.map((f) => `'${f}'`).join(", ");

      await runSQL(
        db,
        `
        COPY (
            SELECT * FROM read_parquet([${fileListSQL}], hive_partitioning=true)
        ) TO '${dailyDestPath}' 
        (FORMAT PARQUET, PARTITION_BY (code_departement), OVERWRITE_OR_IGNORE);
        `,
      );
      console.log(
        chalk.green(
          `   ✅ Daily consolidation complete for ${year}-${month}-${day}`,
        ),
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(
        chalk.red(`   ❌ Daily consolidation failed: ${err.message}`),
      );
    }
  }

  // 2. Monthly Consolidation
  // Check if today is the last day of the month OR if a target date is forced (we assume force implies intent)
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isLastDayOfMonth = tomorrow.getMonth() !== now.getMonth();

  if (isLastDayOfMonth || targetDate) {
    console.log(
      chalk.blue(
        `   -> Monthly Consolidation Triggered (Last day: ${isLastDayOfMonth}, Forced: ${!!targetDate}): ${year}-${month}`,
      ),
    );

    // Read from DAILY consolidated files for this month
    // Source: consolidated/daily/year=YYYY/month=MM/*/*/*.parquet
    // Note: We need to make sure the daily consolidation for TODAY is finished and uploaded?
    // Actually, we write to local disk first.
    // If we read from HF, we miss today's consolidated file (which is local).
    // So we should read from HF for previous days AND local for today?
    // OR: We just read from history (hourly) for the whole month. It's safer and simpler.

    console.log(chalk.gray(`      Scanning for monthly source files...`));
    const monthlyPrefix = `data/history/year=${year}/month=${month}`;
    const monthlyFiles = await listParquetFiles(hfRepo, hfToken, monthlyPrefix);

    if (monthlyFiles.length === 0) {
      console.log(
        chalk.yellow(
          `   ⚠️ No source files found for ${year}-${month} (skipping)`,
        ),
      );
    } else {
      console.log(
        chalk.gray(`      Found ${monthlyFiles.length} files to consolidate.`),
      );
      const monthlyDestPath = path.join(
        outputDir,
        "consolidated",
        "monthly",
        `year=${year}`,
        `month=${month}`,
      );

      // Ensure destination parent dir exists
      fs.mkdirSync(path.dirname(monthlyDestPath), { recursive: true });

      try {
        const fileListSQL = monthlyFiles.map((f) => `'${f}'`).join(", ");
        await runSQL(
          db,
          `
                COPY (
                SELECT * FROM read_parquet([${fileListSQL}], hive_partitioning=true)
                ) TO '${monthlyDestPath}' 
                (FORMAT PARQUET, PARTITION_BY (code_departement), OVERWRITE_OR_IGNORE);
            `,
        );
        console.log(
          chalk.green(
            `   ✅ Monthly consolidation complete for ${year}-${month}`,
          ),
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error(
          chalk.red(`   ❌ Monthly consolidation failed: ${err.message}`),
        );
      }
    }
  } else {
    console.log(
      chalk.gray(
        `   -> Not last day of month (${day}/${month}), skipping monthly consolidation.`,
      ),
    );
  }

  // 3. Upload Consolidated Files
  console.log(`⬆️ Uploading consolidated files to Hugging Face (${hfRepo})...`);

  const filesToUpload: { path: string; content: Blob }[] = [];
  const consolidatedDir = path.join(outputDir, "consolidated");

  if (fs.existsSync(consolidatedDir)) {
    function scanDir(dir: string, baseDir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(outputDir, fullPath).replace(/\\/g, "/"); // data/consolidated/...

        if (entry.isDirectory()) {
          scanDir(fullPath, baseDir);
        } else {
          filesToUpload.push({
            path: `data/${relPath}`, // Prefix with data/ to match repo structure
            content: new Blob([fs.readFileSync(fullPath)]),
          });
        }
      }
    }

    // Scan only the consolidated directory
    // outputDir is 'data', so relPath will be 'consolidated/...'
    // We want to upload to 'data/consolidated/...' in repo.
    // In index.ts, outputDir is 'data'.
    // relPath = 'consolidated/daily/...'
    // path in repo = 'data/consolidated/daily/...'
    scanDir(consolidatedDir, outputDir);

    if (filesToUpload.length > 0) {
      console.log(
        chalk.green(
          `   Found ${filesToUpload.length} consolidated files to upload.`,
        ),
      );
      await uploadFilesWithRetry({
        repo: { type: "dataset", name: hfRepo },
        credentials: { accessToken: hfToken },
        files: filesToUpload,
        commitTitle: `Consolidation: ${year}-${month}-${day} (${filesToUpload.length} files)`,
      });
      console.log(chalk.green("✅ Consolidation upload complete."));
    } else {
      console.log(chalk.yellow("⚠️ No consolidated files found to upload."));
    }
  } else {
    console.log(chalk.yellow("⚠️ Consolidated directory does not exist."));
  }
}

// Wrapper to run consolidation service
export async function runConsolidationService() {
  if (!HF_TOKEN || !HF_REPO) {
    console.error(chalk.red("❌ Missing HF_TOKEN or HF_REPO"));
    throw new Error("Missing HF_TOKEN or HF_REPO");
  }
  const db = await initDB();
  try {
    await consolidateData({
      db,
      hfToken: HF_TOKEN,
      hfRepo: HF_REPO,
      outputDir: OUTPUT_DIR,
    });
  } catch (error) {
    console.error(chalk.red("❌ Consolidation failed:"), error);
    throw error;
  } finally {
    db.close();
  }
}
