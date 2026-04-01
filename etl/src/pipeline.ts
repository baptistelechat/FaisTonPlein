import chalk from "chalk";
import fs from "fs";
import { HF_REPO, HF_TOKEN, OUTPUT_DIR, UPTIME_PUSH_URL } from "./config";
import { runConsolidationService } from "./consolidate";
import { initDB } from "./db";
import { ensureRepoExists, uploadDirectory } from "./hf";
import { CSV_TEMP_PATH, processFuelData } from "./transform";

export function sendUptimeHeartbeat(status: "up" | "down", msg: string) {
  if (!UPTIME_PUSH_URL) return;
  try {
    const url = new URL(UPTIME_PUSH_URL);
    url.searchParams.set("status", status);
    url.searchParams.set("msg", msg);
    fetch(url.toString()).catch(() => {
      console.warn(chalk.yellow("⚠️ Uptime Kuma heartbeat failed (non-blocking)"));
    });
  } catch {
    // URL invalide, non-bloquant
  }
}

export async function runETL() {
  const now = new Date().toISOString();
  console.log(chalk.blue(`🚀 [${now}] Starting ETL job...`));

  if (!HF_TOKEN || !HF_REPO) {
    console.error(chalk.red("❌ Missing HF_TOKEN or HF_REPO in .env"));
    return;
  }

  // Ensure repo exists before processing
  await ensureRepoExists();

  const db = await initDB();

  try {
    // Process Data (Extract & Transform)
    await processFuelData(db);

    // Upload to HF (Load)
    await uploadDirectory(
      OUTPUT_DIR,
      HF_REPO,
      HF_TOKEN,
      `Update fuel prices ${new Date().toISOString()}`,
    );

    console.log(
      chalk.green(
        `🎉 [${new Date().toISOString()}] ETL job completed successfully.`,
      ),
    );

    // Cleanup: Remove local data directory after successful upload to save space
    console.log(chalk.gray("🧹 Cleaning up local data..."));
    if (fs.existsSync(OUTPUT_DIR)) {
      fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    }
  } catch (error) {
    console.error(
      chalk.red(`❌ [${new Date().toISOString()}] ETL job failed:`),
      error,
    );
    throw error; // Rethrow to stop pipeline execution
  } finally {
    // db.close() libère tous les handles de fichiers DuckDB
    db.close();
    // Suppression du CSV temp après fermeture DB (handle libéré sur Windows)
    try {
      if (fs.existsSync(CSV_TEMP_PATH)) fs.rmSync(CSV_TEMP_PATH);
    } catch {
      // Non-bloquant
    }
  }
}

export async function runPipeline() {
  console.log(chalk.blue("🚀 Starting Pipeline (ETL + Consolidation)..."));
  try {
    await runETL();

    // Check if it's time for consolidation (>= 22:00)
    const currentHour = new Date().getHours();
    if (currentHour >= 22) {
      console.log(chalk.blue("✅ ETL finished, starting Consolidation..."));
      await runConsolidationService();
    } else {
      console.log(
        chalk.gray(
          `ℹ️ Skipping Consolidation (Current hour: ${currentHour}, Target: >= 22)`,
        ),
      );
    }

    console.log(chalk.green("🎉 Pipeline completed successfully."));
    sendUptimeHeartbeat("up", "OK");
  } catch (error) {
    console.error(chalk.red("❌ Pipeline failed:"), error);
    const msg = error instanceof Error ? error.message.slice(0, 100) : "Pipeline failed";
    sendUptimeHeartbeat("down", msg);
  }
}
