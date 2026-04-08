import chalk from "chalk";
import { Database } from "duckdb";
import fs from "fs";
import path from "path";
import { HF_REPO, HF_TOKEN, OUTPUT_DIR } from "./config";
import { initDB, runSQL } from "./db";
import { downloadFilesToLocal, listParquetFiles, uploadFilesWithRetry } from "./hf";

const LOCK_RELEASE_DELAY_MS = 500;
const FINAL_CLEANUP_DELAY_MS = 1000;

interface RollingOptions {
  db: Database;
  hfToken: string;
  hfRepo: string;
  outputDir: string;
  targetDate?: Date;
}

export async function generateRolling30Days({
  db,
  hfToken,
  hfRepo,
  outputDir,
  targetDate,
}: RollingOptions) {
  const now = targetDate ?? new Date();
  console.log(chalk.blue("🔄 Generating Rolling 30-Day Files (1 file per dept)..."));

  // Lister les fichiers daily consolidés des 30 derniers jours
  const allFiles: string[] = [];
  for (let i = 1; i <= 30; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const year = String(d.getFullYear());
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const prefix = `data/consolidated/daily/year=${year}/month=${month}/day=${day}`;
    const files = await listParquetFiles(hfRepo, hfToken, prefix);
    allFiles.push(...files);
  }

  if (allFiles.length === 0) {
    console.log(chalk.yellow("⚠️ No daily consolidated files found — rolling skipped"));
    return;
  }

  console.log(chalk.gray(`   Found ${allFiles.length} daily files across 30 days`));

  // Télécharger localement
  const tempDir = path.join(outputDir, "temp_rolling");
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  const hfPrefix = `hf://datasets/${hfRepo}/`;
  const relativeFiles = allFiles
    .filter((f) => f.startsWith(hfPrefix))
    .map((f) => f.slice(hfPrefix.length));

  console.log(chalk.gray(`   Downloading ${relativeFiles.length} files...`));
  await downloadFilesToLocal(hfRepo, hfToken, relativeFiles, tempDir, 5);

  // Les fichiers daily ont déjà 1 ligne/station/jour (AVG fait dans la consolidation daily)
  // year/month/day sont des colonnes data, code_departement est dans le path
  // → filename=true + regexp_extract pour récupérer code_departement sans conflit
  const destPath = path.join(outputDir, "rolling", "30days");
  fs.mkdirSync(destPath, { recursive: true });

  const globPattern = path.join(tempDir, "**/*.parquet").replace(/\\/g, "/");

  // Les fichiers daily ont déjà 1 ligne/station/jour (AVG fait dans la consolidation daily)
  // → simple SELECT * + construction de la colonne date depuis year/month/day
  console.log(chalk.gray("   Running DuckDB consolidation..."));
  await runSQL(
    db,
    `
    COPY (
      SELECT
        id,
        year || '-' || month || '-' || day AS date,
        regexp_extract(filename, 'code_departement=([^/]+)', 1) AS code_departement,
        "Prix Gazole",
        "Prix E10",
        "Prix SP95",
        "Prix SP98",
        "Prix E85",
        "Prix GPLc"
      FROM read_parquet('${globPattern}', filename=true)
      WHERE regexp_extract(filename, 'code_departement=([^/]+)', 1) <> ''
      ORDER BY date
    ) TO '${destPath}'
    (FORMAT PARQUET, PARTITION_BY (code_departement), OVERWRITE_OR_IGNORE);
    `,
  );

  console.log(chalk.green("   ✅ Rolling aggregation done"));

  // Cleanup temp
  try {
    await new Promise((resolve) => setTimeout(resolve, LOCK_RELEASE_DELAY_MS));
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
  } catch {
    // Non-bloquant
  }

  // Upload
  const rollingDir = path.join(outputDir, "rolling");
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
  scanDir(rollingDir);

  if (filesToUpload.length === 0) {
    console.log(chalk.yellow("⚠️ No rolling files to upload"));
    return;
  }

  const today = now.toISOString().slice(0, 10);
  console.log(chalk.gray(`   Uploading ${filesToUpload.length} rolling files...`));
  await uploadFilesWithRetry({
    repo: { type: "dataset", name: hfRepo },
    credentials: { accessToken: hfToken },
    files: filesToUpload,
    commitTitle: `Rolling 30d: ${today} (${filesToUpload.length} depts)`,
  });

  console.log(chalk.green(`✅ Rolling 30-day upload complete (${filesToUpload.length} files)`));
}

export async function runRollingService() {
  if (!HF_TOKEN || !HF_REPO) {
    throw new Error("Missing HF_TOKEN or HF_REPO");
  }

  const db = await initDB();
  try {
    await generateRolling30Days({
      db,
      hfToken: HF_TOKEN,
      hfRepo: HF_REPO,
      outputDir: OUTPUT_DIR,
    });
  } catch (error) {
    console.error(chalk.red("❌ Rolling generation failed:"), error);
    throw error;
  } finally {
    try {
      db.close();
    } catch {
      // Non-bloquant
    }
    const rollingDir = path.join(OUTPUT_DIR, "rolling");
    if (fs.existsSync(rollingDir)) {
      try {
        await new Promise((resolve) => setTimeout(resolve, FINAL_CLEANUP_DELAY_MS));
        fs.rmSync(rollingDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 1000 });
        console.log(chalk.green("✅ Rolling local dir cleaned up"));
      } catch {
        // Non-bloquant
      }
    }
  }
}
