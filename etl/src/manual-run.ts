import chalk from "chalk";
import { runConsolidationService } from "./consolidate";
import { runETL, sendUptimeHeartbeat } from "./pipeline";
import { runRollingService } from "./rolling";

(async () => {
  console.log(chalk.bgBlue("🚀 Manual Pipeline Trigger (ETL + Consolidation + Rolling)"));
  try {
    console.log(chalk.blue("1. Running ETL..."));
    await runETL();

    console.log(chalk.blue("2. Running Consolidation (Forced)..."));
    await runConsolidationService();

    console.log(chalk.blue("3. Generating Rolling 30-Day Files..."));
    await runRollingService();

    console.log(chalk.green("✅ Manual run complete."));
    sendUptimeHeartbeat("up", "OK");
  } catch (error) {
    console.error(chalk.red("❌ Manual run failed:"), error);
    const msg = error instanceof Error ? error.message.slice(0, 100) : "Manual run failed";
    sendUptimeHeartbeat("down", msg);
    process.exit(1);
  }
})();
