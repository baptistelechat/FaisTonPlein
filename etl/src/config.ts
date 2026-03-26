import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const HF_TOKEN = process.env.HF_TOKEN;
export const HF_REPO = process.env.HF_REPO; // e.g., "username/fuel-prices-france"
export const CSV_URL =
  "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/exports/csv?use_labels=true";

// Use process.cwd() for output to keep it consistent regardless of where the script runs from (assuming executed from 'etl/')
export const OUTPUT_DIR = path.join(process.cwd(), "data");
export const CRON_SCHEDULE = process.env.CRON_SCHEDULE || "0 * * * *";
