import chalk from "chalk";
import fs from "fs";
import { HF_REPO, HF_TOKEN, OUTPUT_DIR } from "./config";
import { runConsolidationService } from "./consolidate";
import { initDB } from "./db";
import { ensureRepoExists, uploadDirectory } from "./hf";
import { processFuelData } from "./transform";

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

    // Start Consolidation (ONLY if specifically requested or scheduled - logic moved to index.ts)
    // We removed automatic consolidation here to separate concerns and schedules.
    // await consolidateData({...});

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
    // Close DB connection
    db.close();
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
  } catch (error) {
    console.error(chalk.red("❌ Pipeline failed:"), error);
  }
}
