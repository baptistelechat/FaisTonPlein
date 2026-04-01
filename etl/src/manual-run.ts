import chalk from "chalk";
import { runConsolidationService } from "./consolidate";
import { runETL, sendUptimeHeartbeat } from "./pipeline";

(async () => {
  console.log(chalk.bgBlue("🚀 Manual Pipeline Trigger (ETL + Consolidation)"));
  try {
    console.log(chalk.blue("1. Running ETL..."));
    await runETL();

    console.log(chalk.blue("2. Running Consolidation (Forced)..."));
    await runConsolidationService();

    console.log(chalk.green("✅ Manual run complete."));
    sendUptimeHeartbeat("up", "OK");
  } catch (error) {
    console.error(chalk.red("❌ Manual run failed:"), error);
    const msg = error instanceof Error ? error.message.slice(0, 100) : "Manual run failed";
    sendUptimeHeartbeat("down", msg);
    process.exit(1);
  }
})();
