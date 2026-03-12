/* eslint-disable @typescript-eslint/no-explicit-any */
import chalk from "chalk";
import { Database } from "duckdb";
import fs from "fs";
import path from "path";
import { HF_REPO, HF_TOKEN, OUTPUT_DIR } from "./config";
import { initDB, runSQL } from "./db";
import {
  downloadFilesToLocal,
  listParquetFiles,
  uploadFilesWithRetry,
} from "./hf";

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
  // We keep the secret creation just in case, though we will try to use local files primarily.
  try {
    console.log(chalk.gray("   🔑 Configuring DuckDB for HF access..."));
    const safeToken = hfToken.replace(/'/g, "''");
    await runSQL(
      db,
      `CREATE OR REPLACE SECRET hf_auth (TYPE HUGGINGFACE, TOKEN '${safeToken}');`,
    );
    console.log(chalk.gray("   ✅ HF Secret created via CREATE SECRET"));
  } catch (err: any) {
    console.warn(chalk.yellow(`⚠️  CREATE SECRET failed: ${err.message}`));
    // Fallback logic omitted for brevity as we switch to local files
  }

  // Helper to process files locally
  async function processFilesLocally(
    files: string[],
    destPath: string,
    label: string,
  ) {
    const tempDir = path.join(outputDir, "temp_consolidation");
    const prefix = `hf://datasets/${hfRepo}/`;

    // Filter and convert to relative paths
    const relativeFiles = files
      .filter((f) => f.startsWith(prefix))
      .map((f) => f.slice(prefix.length));

    if (relativeFiles.length === 0) {
      console.log(chalk.yellow(`   ⚠️ No valid files to process for ${label}`));
      return;
    }

    console.log(
      chalk.gray(
        `      Downloading ${relativeFiles.length} files to temp dir...`,
      ),
    );

    try {
      // Download files
      await downloadFilesToLocal(hfRepo, hfToken, relativeFiles, tempDir, 10);

      // Map to absolute local paths
      const localFiles = relativeFiles.map((f) =>
        path.join(tempDir, f).replace(/\\/g, "/"),
      );

      // Ensure destination parent dir exists
      fs.mkdirSync(path.dirname(destPath), { recursive: true });

      // Enable progress bar
      await runSQL(db, "PRAGMA enable_progress_bar;");

      const fileListSQL = localFiles.map((f) => `'${f}'`).join(", ");

      await runSQL(
        db,
        `
        COPY (
            SELECT * FROM read_parquet([${fileListSQL}], hive_partitioning=true)
        ) TO '${destPath}' 
        (FORMAT PARQUET, PARTITION_BY (code_departement), OVERWRITE_OR_IGNORE);
        `,
      );
      console.log(chalk.green(`   ✅ ${label} consolidation complete`));
    } catch (err: any) {
      console.error(
        chalk.red(`   ❌ ${label} consolidation failed: ${err.message}`),
      );
      throw err; // Re-throw to ensure we know about failures
    } finally {
      // Cleanup temp files (best effort, will be cleaned up properly after DB close)
      if (fs.existsSync(tempDir)) {
        try {
          // Try a quick cleanup, but don't block/fail if locked
          fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 1 });
        } catch (e) {
          console.log(
            chalk.gray(
              `      ⏳ Temp files locked, deferring cleanup to end of process...`,e
            ),
          );
        }
      }
    }
  }

  // 1. Daily Consolidation
  console.log(chalk.blue(`   -> Consolidating Daily: ${year}-${month}-${day}`));
  console.log(chalk.gray(`      Scanning for source files...`));

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

    try {
      await processFilesLocally(dailyFiles, dailyDestPath, "Daily");
    } catch (e) {
      console.error(chalk.red("Failed to consolidate daily data"), e);
    }
  }

  // 2. Monthly Consolidation
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isLastDayOfMonth = tomorrow.getMonth() !== now.getMonth();

  if (isLastDayOfMonth || targetDate) {
    console.log(
      chalk.blue(
        `   -> Monthly Consolidation Triggered (Last day: ${isLastDayOfMonth}, Forced: ${!!targetDate}): ${year}-${month}`,
      ),
    );

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

      try {
        await processFilesLocally(monthlyFiles, monthlyDestPath, "Monthly");
      } catch (e) {
        console.error(chalk.red("Failed to consolidate monthly data"), e);
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
    try {
      db.close();
    } catch (e: any) {
      console.warn(chalk.yellow(`⚠️ Failed to close DB cleanly: ${e.message}`));
    }

    // Final cleanup of data directory (including temp files)
    if (fs.existsSync(OUTPUT_DIR)) {
      console.log(
        chalk.gray(`🧹 Performing final cleanup of ${OUTPUT_DIR}...`),
      );
      try {
        // Give a small grace period for file handles to release
        await new Promise((resolve) => setTimeout(resolve, 1000));
        fs.rmSync(OUTPUT_DIR, {
          recursive: true,
          force: true,
          maxRetries: 5,
          retryDelay: 1000,
        });
        console.log(chalk.green(`✅ Local data directory cleaned up.`));
      } catch (err: any) {
        console.warn(chalk.yellow(`⚠️ Final cleanup failed: ${err.message}`));
      }
    }
  }
}
