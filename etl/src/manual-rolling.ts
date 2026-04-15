import chalk from "chalk";
import { HF_REPO, HF_TOKEN, OUTPUT_DIR } from "./config";
import { generateRolling30Days } from "./rolling";

async function runManualRolling() {
  console.log(chalk.bgBlue("🔄 Manual Rolling 30-Day Tool"));

  if (!HF_TOKEN || !HF_REPO) {
    console.error(chalk.red("❌ Missing HF_TOKEN or HF_REPO in .env"));
    process.exit(1);
  }

  // Argument optionnel : date cible au format YYYY-MM-DD
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
  }

  try {
    await generateRolling30Days({
      hfToken: HF_TOKEN,
      hfRepo: HF_REPO,
      outputDir: OUTPUT_DIR,
      targetDate,
    });
    console.log(chalk.green("✅ Manual rolling finished."));
  } catch (error) {
    console.error(chalk.red("❌ Rolling failed:"), error);
    process.exit(1);
  }

  process.exit(0);
}

runManualRolling();
