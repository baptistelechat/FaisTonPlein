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

const LOCK_RELEASE_DELAY_MS = 500;
const FINAL_CLEANUP_DELAY_MS = 1000;

interface ConsolidationOptions {
  db: Database;
  hfToken: string;
  hfRepo: string;
  outputDir: string;
  targetDate?: Date;
}

export async function consolidateData({
  db,
  hfToken,
  hfRepo,
  outputDir,
  targetDate,
}: ConsolidationOptions) {
  const now = targetDate ?? new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  console.log(
    chalk.blue(
      `🔄 [${now.toISOString()}] Starting Consolidation (Target: ${year}-${month}-${day})...`,
    ),
  );

  // DuckDB secret for direct HF access (used if local download fails)
  try {
    console.log(chalk.gray("   🔑 Configuring DuckDB for HF access..."));
    const safeToken = hfToken.replace(/'/g, "''");
    await runSQL(
      db,
      `CREATE OR REPLACE SECRET hf_auth (TYPE HUGGINGFACE, TOKEN '${safeToken}');`,
    );
    console.log(chalk.gray("   ✅ HF Secret created via CREATE SECRET"));
  } catch (err: unknown) {
    console.warn(
      chalk.yellow(
        `⚠️  CREATE SECRET failed: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
  }

  // mode 'daily'   : source = fichiers hourly (hive_partitioning) → toutes colonnes + AVG prix par (id, dept, year, month, day)
  // mode 'monthly' : source = fichiers daily  (filename=true)     → toutes colonnes + AVG prix par (id, dept, year, month)
  async function processFilesLocally(
    files: string[],
    destPath: string,
    label: string,
    mode: "daily" | "monthly",
    tempDirName = "temp_consolidation",
  ) {
    const tempDir = path.join(outputDir, tempDirName);
    const prefix = `hf://datasets/${hfRepo}/`;

    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

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
      const downloadedFiles = await downloadFilesToLocal(
        hfRepo,
        hfToken,
        relativeFiles,
        tempDir,
        3,
      );

      if (downloadedFiles.length === 0) {
        console.warn(
          chalk.yellow(`   ⚠️ No files downloaded successfully for ${label}.`),
        );
        return;
      }

      console.log(
        chalk.gray(`      Downloaded ${downloadedFiles.length} files.`),
      );

      fs.mkdirSync(path.dirname(destPath), { recursive: true });

      const globPattern = path
        .join(tempDir, "**/*.parquet")
        .replace(/\\/g, "/");
      console.log(
        chalk.gray(
          `      Running DuckDB COPY (${mode}) from '${globPattern}'...`,
        ),
      );

      const sql =
        mode === "daily"
          ? // Source : fichiers hourly — hive_partitioning ajoute year/month/day/hour/code_departement
            // Toutes les colonnes sont conservées. Les prix sont moyennés sur la journée,
            // les autres colonnes prennent la dernière valeur connue (ARG_MAX sur extraction_date).
            `
            COPY (
              SELECT
                id,
                code_departement,
                year, month, day,
                -- Infos station (valeur la plus récente)
                ARG_MAX(latitude,                        extraction_date) AS latitude,
                ARG_MAX(longitude,                       extraction_date) AS longitude,
                ARG_MAX("Code postal",                   extraction_date) AS "Code postal",
                ARG_MAX(pop,                             extraction_date) AS pop,
                ARG_MAX("Adresse",                       extraction_date) AS "Adresse",
                ARG_MAX("Ville",                         extraction_date) AS "Ville",
                ARG_MAX(services,                        extraction_date) AS services,
                ARG_MAX("Automate 24-24 (oui/non)",      extraction_date) AS "Automate 24-24 (oui/non)",
                ARG_MAX("Services proposés",             extraction_date) AS "Services proposés",
                ARG_MAX("horaires détaillés",            extraction_date) AS "horaires détaillés",
                ARG_MAX("Département",                   extraction_date) AS "Département",
                ARG_MAX("Région",                        extraction_date) AS "Région",
                ARG_MAX(code_region,                     extraction_date) AS code_region,
                -- Prix (moyenne journalière des relevés non-null)
                AVG(TRY_CAST("Prix Gazole" AS DOUBLE))   AS "Prix Gazole",
                ARG_MAX("Prix Gazole mis à jour le",     extraction_date) AS "Prix Gazole mis à jour le",
                AVG(TRY_CAST("Prix E10"    AS DOUBLE))   AS "Prix E10",
                ARG_MAX("Prix E10 mis à jour le",        extraction_date) AS "Prix E10 mis à jour le",
                AVG(TRY_CAST("Prix SP95"   AS DOUBLE))   AS "Prix SP95",
                ARG_MAX("Prix SP95 mis à jour le",       extraction_date) AS "Prix SP95 mis à jour le",
                AVG(TRY_CAST("Prix SP98"   AS DOUBLE))   AS "Prix SP98",
                ARG_MAX("Prix SP98 mis à jour le",       extraction_date) AS "Prix SP98 mis à jour le",
                AVG(TRY_CAST("Prix E85"    AS DOUBLE))   AS "Prix E85",
                ARG_MAX("Prix E85 mis à jour le",        extraction_date) AS "Prix E85 mis à jour le",
                AVG(TRY_CAST("Prix GPLc"   AS DOUBLE))   AS "Prix GPLc",
                ARG_MAX("Prix GPLc mis à jour le",       extraction_date) AS "Prix GPLc mis à jour le",
                -- Rupture (état le plus récent de la journée)
                ARG_MAX("Début rupture gazole (si temporaire)", extraction_date) AS "Début rupture gazole (si temporaire)",
                ARG_MAX("Type rupture gazole",           extraction_date) AS "Type rupture gazole",
                ARG_MAX("Début rupture e10 (si temporaire)", extraction_date) AS "Début rupture e10 (si temporaire)",
                ARG_MAX("Type rupture e10",              extraction_date) AS "Type rupture e10",
                ARG_MAX("Début rupture sp95 (si temporaire)", extraction_date) AS "Début rupture sp95 (si temporaire)",
                ARG_MAX("Type rupture sp95",             extraction_date) AS "Type rupture sp95",
                ARG_MAX("Début rupture sp98 (si temporaire)", extraction_date) AS "Début rupture sp98 (si temporaire)",
                ARG_MAX("Type rupture sp98",             extraction_date) AS "Type rupture sp98",
                ARG_MAX("Début rupture e85 (si temporaire)", extraction_date) AS "Début rupture e85 (si temporaire)",
                ARG_MAX("Type rupture e85",              extraction_date) AS "Type rupture e85",
                ARG_MAX("Début rupture GPLc (si temporaire)", extraction_date) AS "Début rupture GPLc (si temporaire)",
                ARG_MAX("Type rupture GPLc",             extraction_date) AS "Type rupture GPLc",
                -- Disponibilité résumée (état le plus récent)
                ARG_MAX("Carburants disponibles",              extraction_date) AS "Carburants disponibles",
                ARG_MAX("Carburants indisponibles",            extraction_date) AS "Carburants indisponibles",
                ARG_MAX("Carburants en rupture temporaire",    extraction_date) AS "Carburants en rupture temporaire",
                ARG_MAX("Carburants en rupture definitive",    extraction_date) AS "Carburants en rupture definitive",
                MAX(extraction_date) AS extraction_date
              FROM read_parquet('${globPattern}', hive_partitioning=true)
              GROUP BY id, code_departement, year, month, day
            ) TO '${destPath}'
            (FORMAT PARQUET, PARTITION_BY (code_departement), OVERWRITE_OR_IGNORE);
            `
          : // Source : fichiers daily — year/month/day déjà en colonnes, code_departement dans le path
            // Toutes les colonnes sont conservées. Les prix sont moyennés sur le mois.
            `
            COPY (
              SELECT
                id,
                regexp_extract(replace(filename, chr(92), '/'), 'code_departement=([^/]+)', 1) AS code_departement,
                year, month,
                -- Infos station (valeur la plus récente)
                ARG_MAX(latitude,                        extraction_date) AS latitude,
                ARG_MAX(longitude,                       extraction_date) AS longitude,
                ARG_MAX("Code postal",                   extraction_date) AS "Code postal",
                ARG_MAX(pop,                             extraction_date) AS pop,
                ARG_MAX("Adresse",                       extraction_date) AS "Adresse",
                ARG_MAX("Ville",                         extraction_date) AS "Ville",
                ARG_MAX(services,                        extraction_date) AS services,
                ARG_MAX("Automate 24-24 (oui/non)",      extraction_date) AS "Automate 24-24 (oui/non)",
                ARG_MAX("Services proposés",             extraction_date) AS "Services proposés",
                ARG_MAX("horaires détaillés",            extraction_date) AS "horaires détaillés",
                ARG_MAX("Département",                   extraction_date) AS "Département",
                ARG_MAX("Région",                        extraction_date) AS "Région",
                ARG_MAX(code_region,                     extraction_date) AS code_region,
                -- Prix (moyenne mensuelle)
                AVG(TRY_CAST("Prix Gazole" AS DOUBLE))   AS "Prix Gazole",
                ARG_MAX("Prix Gazole mis à jour le",     extraction_date) AS "Prix Gazole mis à jour le",
                AVG(TRY_CAST("Prix E10"    AS DOUBLE))   AS "Prix E10",
                ARG_MAX("Prix E10 mis à jour le",        extraction_date) AS "Prix E10 mis à jour le",
                AVG(TRY_CAST("Prix SP95"   AS DOUBLE))   AS "Prix SP95",
                ARG_MAX("Prix SP95 mis à jour le",       extraction_date) AS "Prix SP95 mis à jour le",
                AVG(TRY_CAST("Prix SP98"   AS DOUBLE))   AS "Prix SP98",
                ARG_MAX("Prix SP98 mis à jour le",       extraction_date) AS "Prix SP98 mis à jour le",
                AVG(TRY_CAST("Prix E85"    AS DOUBLE))   AS "Prix E85",
                ARG_MAX("Prix E85 mis à jour le",        extraction_date) AS "Prix E85 mis à jour le",
                AVG(TRY_CAST("Prix GPLc"   AS DOUBLE))   AS "Prix GPLc",
                ARG_MAX("Prix GPLc mis à jour le",       extraction_date) AS "Prix GPLc mis à jour le",
                -- Rupture (état le plus récent du mois)
                ARG_MAX("Début rupture gazole (si temporaire)", extraction_date) AS "Début rupture gazole (si temporaire)",
                ARG_MAX("Type rupture gazole",           extraction_date) AS "Type rupture gazole",
                ARG_MAX("Début rupture e10 (si temporaire)", extraction_date) AS "Début rupture e10 (si temporaire)",
                ARG_MAX("Type rupture e10",              extraction_date) AS "Type rupture e10",
                ARG_MAX("Début rupture sp95 (si temporaire)", extraction_date) AS "Début rupture sp95 (si temporaire)",
                ARG_MAX("Type rupture sp95",             extraction_date) AS "Type rupture sp95",
                ARG_MAX("Début rupture sp98 (si temporaire)", extraction_date) AS "Début rupture sp98 (si temporaire)",
                ARG_MAX("Type rupture sp98",             extraction_date) AS "Type rupture sp98",
                ARG_MAX("Début rupture e85 (si temporaire)", extraction_date) AS "Début rupture e85 (si temporaire)",
                ARG_MAX("Type rupture e85",              extraction_date) AS "Type rupture e85",
                ARG_MAX("Début rupture GPLc (si temporaire)", extraction_date) AS "Début rupture GPLc (si temporaire)",
                ARG_MAX("Type rupture GPLc",             extraction_date) AS "Type rupture GPLc",
                -- Disponibilité résumée
                ARG_MAX("Carburants disponibles",              extraction_date) AS "Carburants disponibles",
                ARG_MAX("Carburants indisponibles",            extraction_date) AS "Carburants indisponibles",
                ARG_MAX("Carburants en rupture temporaire",    extraction_date) AS "Carburants en rupture temporaire",
                ARG_MAX("Carburants en rupture definitive",    extraction_date) AS "Carburants en rupture definitive",
                MAX(extraction_date) AS extraction_date
              FROM read_parquet('${globPattern}', filename=true)
              WHERE regexp_extract(replace(filename, chr(92), '/'), 'code_departement=([^/]+)', 1) <> ''
              GROUP BY id, regexp_extract(replace(filename, chr(92), '/'), 'code_departement=([^/]+)', 1), year, month
            ) TO '${destPath}'
            (FORMAT PARQUET, PARTITION_BY (code_departement), OVERWRITE_OR_IGNORE);
            `;

      await runSQL(db, sql);
      console.log(chalk.green(`   ✅ ${label} consolidation complete`));
    } catch (err: unknown) {
      console.error(
        chalk.red(
          `   ❌ ${label} consolidation failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
      throw err;
    } finally {
      if (fs.existsSync(tempDir)) {
        try {
          await new Promise((resolve) =>
            setTimeout(resolve, LOCK_RELEASE_DELAY_MS),
          );
          fs.rmSync(tempDir, {
            recursive: true,
            force: true,
            maxRetries: 3,
            retryDelay: 500,
          });
        } catch (e: unknown) {
          const code =
            e instanceof Error ? (e as NodeJS.ErrnoException).code : "";
          console.log(
            chalk.gray(
              `      ⏳ Temp files locked (${code}), deferring cleanup...`,
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
      await processFilesLocally(dailyFiles, dailyDestPath, "Daily", "daily");
    } catch (e) {
      console.error(chalk.red("Failed to consolidate daily data"), e);
    }
  }

  // 2. Monthly Consolidation (last day of month, or forced via targetDate)
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isLastDayOfMonth = tomorrow.getMonth() !== now.getMonth();

  if (isLastDayOfMonth) {
    console.log(
      chalk.blue(
        `   -> Monthly Consolidation Triggered (Last day of month): ${year}-${month}`,
      ),
    );

    console.log(
      chalk.gray(
        `      Scanning for monthly source files (daily consolidated)...`,
      ),
    );
    // Lire les fichiers daily déjà consolidés (~31j × 97 depts) plutôt que les
    // fichiers history bruts horaires (~12runs/j × 31j × 97 depts = 23k+ fichiers)
    const monthlyPrefix = `data/consolidated/daily/year=${year}/month=${month}`;
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
        await processFilesLocally(
          monthlyFiles,
          monthlyDestPath,
          "Monthly",
          "monthly",
          "temp_consolidation_monthly",
        );
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

  const consolidatedDir = path.join(outputDir, "consolidated");

  if (!fs.existsSync(consolidatedDir)) {
    console.log(chalk.yellow("⚠️ Consolidated directory does not exist."));
    return;
  }

  const filesToUpload: Array<{ path: string; content: Blob }> = [];

  function scanDir(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else {
        const relPath = path.relative(outputDir, fullPath).replace(/\\/g, "/");
        filesToUpload.push({
          path: `data/${relPath}`,
          content: new Blob([fs.readFileSync(fullPath)]),
        });
      }
    }
  }

  scanDir(consolidatedDir);

  if (filesToUpload.length === 0) {
    console.log(chalk.yellow("⚠️ No consolidated files found to upload."));
    return;
  }

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
}

export async function runConsolidationService() {
  if (!HF_TOKEN || !HF_REPO) {
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
    } catch (e: unknown) {
      console.warn(
        chalk.yellow(
          `⚠️ Failed to close DB cleanly: ${e instanceof Error ? e.message : String(e)}`,
        ),
      );
    }

    if (fs.existsSync(OUTPUT_DIR)) {
      console.log(
        chalk.gray(`🧹 Performing final cleanup of ${OUTPUT_DIR}...`),
      );
      try {
        await new Promise((resolve) =>
          setTimeout(resolve, FINAL_CLEANUP_DELAY_MS),
        );
        fs.rmSync(OUTPUT_DIR, {
          recursive: true,
          force: true,
          maxRetries: 5,
          retryDelay: 1000,
        });
        console.log(chalk.green(`✅ Local data directory cleaned up.`));
      } catch (err: unknown) {
        console.warn(
          chalk.yellow(
            `⚠️ Final cleanup failed: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
      }
    }
  }
}
