import { Database } from "duckdb";
import fs from "fs";
import path from "path";
import chalk from "chalk";

// Helper to run SQL
export function runSQL(db: Database, sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function initDB(): Promise<Database> {
  // Set environment variables that DuckDB might use
  const localHome = path.join(process.cwd(), "duckdb_home");
  if (!fs.existsSync(localHome)) {
    fs.mkdirSync(localHome, { recursive: true });
  }

  // It seems setting HOME env var is the most reliable way to trick DuckDB on Windows
  // when it fails to access the real user home.
  process.env.HOME = localHome;
  process.env.USERPROFILE = localHome;

  const db = new Database(":memory:", {
    allow_unsigned_extensions: "true",
  });

  try {
    // Install httpfs extension for fetching remote CSV
    // This is critical for ETL to work with remote files
    await runSQL(db, "INSTALL httpfs; LOAD httpfs;");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error(
      chalk.red(
        `❌ CRITICAL: Could not install/load httpfs extension: ${err.message}`,
      ),
    );
    throw err;
  }

  return db;
}
