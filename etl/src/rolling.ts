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
  console.log(
    chalk.blue("🔄 Generating Rolling 30-Day Files (1 file per dept)..."),
  );

  // Lister les fichiers daily consolidés des 30 derniers jours
  const allFiles: string[] = [];
  for (let i = 0; i <= 29; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const year = String(d.getFullYear());
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const prefix = `data/consolidated/daily/year=${year}/month=${month}/day=${day}`;
    try {
      const files = await listParquetFiles(hfRepo, hfToken, prefix);
      allFiles.push(...files);
    } catch {
      // Jour non consolidé (pas encore généré ou trop ancien) — on saute
    }
  }

  if (allFiles.length === 0) {
    console.log(
      chalk.yellow("⚠️ No daily consolidated files found — rolling skipped"),
    );
    return;
  }

  console.log(
    chalk.gray(`   Found ${allFiles.length} daily files across 30 days`),
  );

  // Regrouper les fichiers par département pour traiter un dept à la fois
  // → évite de charger 2880 fichiers simultanément en mémoire (OOM sur RPi)
  const hfPrefix = `hf://datasets/${hfRepo}/`;
  const byDept = new Map<string, string[]>();
  for (const file of allFiles) {
    if (!file.startsWith(hfPrefix)) continue;
    const relPath = file.slice(hfPrefix.length);
    const match = relPath.match(/code_departement=([^/]+)/);
    if (!match) continue;
    const dept = match[1];
    if (!byDept.has(dept)) byDept.set(dept, []);
    byDept.get(dept)!.push(relPath);
  }

  const depts = [...byDept.keys()].sort();
  console.log(
    chalk.gray(
      `   Processing ${depts.length} departments one by one (memory-efficient)...`,
    ),
  );

  // Repartir d'un dossier rolling vierge
  const rollingDir = path.join(outputDir, "rolling");
  if (fs.existsSync(rollingDir)) {
    fs.rmSync(rollingDir, { recursive: true, force: true });
  }
  const destBase = path.join(rollingDir, "30days");
  fs.mkdirSync(destBase, { recursive: true });

  const tempDir = path.join(outputDir, "temp_rolling");

  for (let di = 0; di < depts.length; di++) {
    const dept = depts[di];
    const deptFiles = byDept.get(dept)!;
    console.log(
      chalk.gray(
        `   [${di + 1}/${depts.length}] dept ${dept} (${deptFiles.length} days)...`,
      ),
    );

    // Télécharger seulement les ~30 fichiers de ce département
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    await downloadFilesToLocal(hfRepo, hfToken, deptFiles, tempDir, 5);

    // Dossier de sortie pour ce département (format Hive compatible)
    const deptDestDir = path
      .join(destBase, `code_departement=${dept}`)
      .replace(/\\/g, "/");
    fs.mkdirSync(deptDestDir, { recursive: true });

    const globPattern = path.join(tempDir, "**/*.parquet").replace(/\\/g, "/");

    // Les fichiers daily ont 1 ligne/station/jour — on reconstruit la date
    // et on ajoute code_departement comme colonne littérale (plus de PARTITION_BY,
    // car on est déjà dans le bon sous-dossier → pas de chargement global)
    // chr(92) = backslash — normalise le filename avant regexp pour Windows
    await runSQL(
      db,
      `
      COPY (
        SELECT
          id,
          year || '-' || month || '-' || day AS date,
          '${dept}' AS code_departement,
          -- Infos station
          latitude, longitude, "Code postal", pop, "Adresse", "Ville", services,
          "Automate 24-24 (oui/non)", "Services proposés", "horaires détaillés",
          "Département", "Région", code_region,
          -- Prix
          "Prix Gazole", "Prix Gazole mis à jour le",
          "Prix E10",    "Prix E10 mis à jour le",
          "Prix SP95",   "Prix SP95 mis à jour le",
          "Prix SP98",   "Prix SP98 mis à jour le",
          "Prix E85",    "Prix E85 mis à jour le",
          "Prix GPLc",   "Prix GPLc mis à jour le",
          -- Rupture
          "Début rupture gazole (si temporaire)", "Type rupture gazole",
          "Début rupture e10 (si temporaire)",    "Type rupture e10",
          "Début rupture sp95 (si temporaire)",   "Type rupture sp95",
          "Début rupture sp98 (si temporaire)",   "Type rupture sp98",
          "Début rupture e85 (si temporaire)",    "Type rupture e85",
          "Début rupture GPLc (si temporaire)",   "Type rupture GPLc",
          -- Disponibilité résumée
          "Carburants disponibles", "Carburants indisponibles",
          "Carburants en rupture temporaire", "Carburants en rupture definitive",
          extraction_date
        FROM read_parquet('${globPattern}', union_by_name=true)
        ORDER BY date
      ) TO '${deptDestDir}'
      (FORMAT PARQUET, OVERWRITE_OR_IGNORE);
      `,
    );

    // Cleanup du temp pour libérer le disque avant le département suivant
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
    } catch {
      // Non-bloquant
    }
  }

  console.log(chalk.green("   ✅ Rolling aggregation done"));

  // Collecter tous les fichiers générés pour l'upload
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
  console.log(
    chalk.gray(`   Uploading ${filesToUpload.length} rolling files...`),
  );
  await uploadFilesWithRetry({
    repo: { type: "dataset", name: hfRepo },
    credentials: { accessToken: hfToken },
    files: filesToUpload,
    commitTitle: `Rolling 30d: ${today} (${filesToUpload.length} depts)`,
  });

  console.log(
    chalk.green(
      `✅ Rolling 30-day upload complete (${filesToUpload.length} files)`,
    ),
  );
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
        await new Promise((resolve) =>
          setTimeout(resolve, FINAL_CLEANUP_DELAY_MS),
        );
        fs.rmSync(rollingDir, {
          recursive: true,
          force: true,
          maxRetries: 5,
          retryDelay: 1000,
        });
        console.log(chalk.green("✅ Rolling local dir cleaned up"));
      } catch {
        // Non-bloquant
      }
    }
  }
}
