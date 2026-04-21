import chalk from "chalk";
import fs from "fs";
import { HF_REPO, HF_TOKEN, OUTPUT_DIR } from "./config";
import { consolidateData } from "./consolidate";
import { initDB } from "./db";

async function runManualConsolidation() {
  console.log(chalk.bgBlue("🔧 Manual Consolidation Tool"));

  if (!HF_TOKEN || !HF_REPO) {
    console.error(chalk.red("❌ Missing HF_TOKEN or HF_REPO in .env"));
    return;
  }

  // Debug: Check token length and validity (basic)
  console.log(chalk.gray(`   🔑 HF Token length: ${HF_TOKEN.length} chars`));
  if (HF_TOKEN.includes("'")) {
    console.warn(
      chalk.yellow(
        "   ⚠️ HF Token contains single quotes! This might be an issue.",
      ),
    );
  }

  const db = await initDB();

  // Parse args for date (YYYY-MM-DD)
  const dateArg = process.argv[2];
  let targetDate: Date | undefined;

  if (dateArg) {
    targetDate = new Date(dateArg);
    if (isNaN(targetDate.getTime())) {
      console.error(chalk.red("❌ Invalid date format. Use YYYY-MM-DD"));
      process.exit(1);
    }
    console.log(chalk.yellow(`📅 Forcing date: ${dateArg}`));
  } else {
    console.log(chalk.yellow("📅 Using current date (default)"));
    // Note: If no date is provided, consolidateData uses 'now'.
    // If 'now' is the last day of month, it will trigger monthly consolidation.
  }

  try {
    await consolidateData({
      db,
      hfToken: HF_TOKEN,
      hfRepo: HF_REPO,
      outputDir: OUTPUT_DIR,
      targetDate,
    });
    console.log(chalk.green("✅ Manual consolidation finished."));
  } catch (error) {
    console.error(chalk.red("❌ Consolidation failed:"), error);
    process.exit(1);
  } finally {
    try {
      db.close();
    } catch (e) {
      console.error(chalk.red("❌ Database close failed:"), e);
    }

    if (fs.existsSync(OUTPUT_DIR)) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        fs.rmSync(OUTPUT_DIR, { recursive: true, force: true, maxRetries: 5, retryDelay: 1000 });
        console.log(chalk.green(`✅ Local data directory cleaned up.`));
      } catch (err: unknown) {
        console.warn(
          chalk.yellow(`⚠️ Cleanup failed: ${err instanceof Error ? err.message : String(err)}`),
        );
      }
    }

    process.exit(0);
  }
}

runManualConsolidation();
