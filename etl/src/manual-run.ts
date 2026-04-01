import chalk from "chalk";
import { runConsolidationService } from "./consolidate";
import { runETL } from "./pipeline";

(async () => {
  console.log(chalk.bgBlue("🚀 Manual Pipeline Trigger (ETL + Consolidation)"));
  try {
    console.log(chalk.blue("1. Running ETL..."));
    await runETL();

    console.log(chalk.blue("2. Running Consolidation (Forced)..."));
    await runConsolidationService();

    console.log(chalk.green("✅ Manual run complete."));
  } catch (error) {
    console.error(chalk.red("❌ Manual run failed:"), error);
    process.exit(1);
  }
})();
