import chalk from "chalk";
import cron from "node-cron";
import { CRON_SCHEDULE, CSV_URL, HF_REPO } from "./src/config";
import { runPipeline } from "./src/pipeline";

console.log(chalk.bgBlue("⛽ Fais Ton Plein - ETL Service started."));
console.log(chalk.gray(`- ETL Schedule: ${CRON_SCHEDULE}`));
console.log(chalk.gray(`- CSV Source: ${CSV_URL}`));
console.log(chalk.gray(`- HF Repo: ${HF_REPO}`));

// Schedule Pipeline (every 2h by default "0 */2 * * *")
cron.schedule(CRON_SCHEDULE, async () => {
  console.log(chalk.blue("⏰ Triggering Scheduled Pipeline..."));
  await runPipeline();
  console.log(chalk.yellow(`⏳ Waiting for next schedule: ${CRON_SCHEDULE}`));
});
