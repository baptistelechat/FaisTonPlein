/* eslint-disable @typescript-eslint/no-explicit-any */

import AdmZip from "adm-zip";
import axios from "axios";
import chalk from "chalk";
import { XMLParser } from "fast-xml-parser";
import fs from "fs";
import path from "path";
import { HF_REPO, HF_TOKEN, OUTPUT_DIR } from "../config";
import { initDB, runSQL } from "../db";
import { uploadDirectory } from "../hf";

const START_YEAR = 2007;
const END_YEAR = 2025;
const CONSOLIDATED_DIR = path.join(OUTPUT_DIR, "consolidated");
const MONTHLY_DIR = path.join(CONSOLIDATED_DIR, "monthly");
const TEMP_DIR = path.join(OUTPUT_DIR, "temp");

// Ensure directories exist
if (!fs.existsSync(MONTHLY_DIR)) {
  fs.mkdirSync(MONTHLY_DIR, { recursive: true });
}
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const FUEL_TYPES = ["Gazole", "SP95", "E10", "SP98", "E85", "GPLc"];
const CSV_HEADER =
  [
    "id",
    "latitude",
    "longitude",
    "cp",
    "pop",
    "adresse",
    "ville",
    "services",
    "maj",
    "code_departement",
    "year",
    "month",
    "day",
    "hour",
    ...FUEL_TYPES.map((f) => `Prix ${f}`),
    ...FUEL_TYPES.map((f) => `Prix ${f} mis à jour le`),
  ].join(",") + "\n";

function getDepartmentFromCP(cp: string): string {
  if (!cp || cp.length < 2) return "XX";
  if (cp.startsWith("20")) {
    const val = parseInt(cp);
    return val < 20200 ? "2A" : "2B";
  }
  return cp.substring(0, 2);
}

async function downloadFile(url: string, dest: string) {
  const writer = fs.createWriteStream(dest);
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });

  response.data.pipe(writer);

  return new Promise<void>((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

async function processYear(year: number) {
  console.log(chalk.blue(`Processing year ${year}...`));
  const url = `https://donnees.roulez-eco.fr/opendata/annee/${year}`;
  const zipPath = path.join(TEMP_DIR, `Prix${year}.zip`);

  try {
    // Download
    if (!fs.existsSync(zipPath)) {
      console.log(chalk.gray(`  Downloading ${url}...`));
      await downloadFile(url, zipPath);
    } else {
      console.log(chalk.gray(`  Using cached ${zipPath}`));
    }

    // Unzip
    console.log(chalk.gray(`  Unzipping...`));
    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();
    const xmlEntry = zipEntries.find((entry: any) =>
      entry.entryName.endsWith(".xml"),
    );

    if (!xmlEntry) {
      throw new Error(`No XML file found in ${zipPath}`);
    }

    // Block for XML processing to allow GC
    {
      const xmlData = xmlEntry.getData().toString("utf8"); // Load into memory

      // Parse XML
      console.log(chalk.gray(`  Parsing XML...`));
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@",
      });
      const result = parser.parse(xmlData);
      const pdvList = result.pdv_liste.pdv; // Array of PDVs

      if (!pdvList || !Array.isArray(pdvList)) {
        console.warn(
          chalk.yellow(`  No PDVs found or invalid format for year ${year}`),
        );
        return;
      }

      console.log(
        chalk.gray(
          `  Converting ${pdvList.length} stations to CSV (split by month)...`,
        ),
      );

      // Create streams for each month
      const streams: Record<string, fs.WriteStream> = {};
      for (let m = 1; m <= 12; m++) {
        const monthStr = String(m).padStart(2, "0");
        const p = path.join(TEMP_DIR, `prices_${year}_${monthStr}.csv`);
        streams[monthStr] = fs.createWriteStream(p, { flags: "w" });
        streams[monthStr].write(CSV_HEADER);
      }

      let count = 0;

      const escapeCsv = (str: string | null | undefined): string => {
        if (str === null || str === undefined) return "";
        const s = String(str).replace(/"/g, '""');
        return `"${s}"`;
      };

      for (const pdv of pdvList) {
        // ... (parsing logic)
        const id = pdv["@id"];
        const lat = parseFloat(pdv["@latitude"]) / 100000;
        const lon = parseFloat(pdv["@longitude"]) / 100000;
        const cp = pdv["@cp"];
        const pop = pdv["@pop"];
        const adresse = pdv.adresse;
        const ville = pdv.ville;
        const dept = getDepartmentFromCP(cp);

        // Services
        let services = [];
        if (pdv.services && pdv.services.service) {
          services = Array.isArray(pdv.services.service)
            ? pdv.services.service
            : [pdv.services.service];
        }
        const servicesJson = JSON.stringify({ service: services });

        // Prices
        const prices = pdv.prix
          ? Array.isArray(pdv.prix)
            ? pdv.prix
            : [pdv.prix]
          : [];

        // Group prices by update time (maj)
        const updates = new Map<string, any[]>();

        for (const price of prices) {
          if (!price["@valeur"] || !price["@maj"]) continue;
          const maj = price["@maj"];
          if (!updates.has(maj)) {
            updates.set(maj, []);
          }
          updates.get(maj)!.push(price);
        }

        for (const [maj, priceList] of updates) {
          // Parse date
          const date = new Date(maj.replace(" ", "T") + "Z");
          if (isNaN(date.getTime())) continue;

          const month = String(date.getUTCMonth() + 1).padStart(2, "0");
          const stream = streams[month];
          if (!stream) continue;

          const rowValues = [
            escapeCsv(id),
            lat,
            lon,
            escapeCsv(cp),
            escapeCsv(pop),
            escapeCsv(adresse),
            escapeCsv(ville),
            escapeCsv(servicesJson),
            escapeCsv(maj),
            escapeCsv(dept),
            date.getUTCFullYear(),
            month,
            String(date.getUTCDate()).padStart(2, "0"),
            String(date.getUTCHours()).padStart(2, "0"),
          ];

          // Prices
          const priceMap: Record<string, { val: number; maj: string }> = {};
          for (const price of priceList) {
            const fuelName = price["@nom"];
            const val = parseFloat(price["@valeur"]) / 1000;
            if (FUEL_TYPES.includes(fuelName)) {
              priceMap[fuelName] = { val, maj };
            }
          }

          for (const fuel of FUEL_TYPES) {
            if (priceMap[fuel]) {
              rowValues.push(String(priceMap[fuel].val));
              rowValues.push(escapeCsv(priceMap[fuel].maj));
            } else {
              rowValues.push("");
              rowValues.push("");
            }
          }

          stream.write(rowValues.join(",") + "\n");
          count++;
        }
      }

      // Close all streams
      await Promise.all(
        Object.values(streams).map(
          (s) =>
            new Promise<void>((resolve, reject) => {
              s.end(() => resolve());
              s.on("error", reject);
            }),
        ),
      );

      console.log(
        chalk.green(`  Generated ${count} price records for ${year}`),
      );
    } // End of block

    // Load into DuckDB and Export to Parquet (Month by Month)
    console.log(
      chalk.gray(`  Loading into DuckDB and writing Parquet (per month)...`),
    );

    // Force GC if available
    if ((global as any).gc) {
      console.log(chalk.gray(`  Forcing Garbage Collection...`));
      (global as any).gc();
    }

    const db = await initDB();

    try {
      console.log(chalk.gray(`    Setting threads...`));
      await runSQL(db, "SET threads=4;");
      await runSQL(db, "SET preserve_insertion_order=false;");

      for (let m = 1; m <= 12; m++) {
        const monthStr = String(m).padStart(2, "0");
        const csvPath = path.join(TEMP_DIR, `prices_${year}_${monthStr}.csv`);

        if (!fs.existsSync(csvPath)) continue;

        // Check if file is empty or too small (just header)
        const stats = fs.statSync(csvPath);
        if (stats.size < CSV_HEADER.length + 10) {
          fs.unlinkSync(csvPath);
          continue;
        }

        console.log(
          chalk.gray(
            `    Processing Month ${monthStr} (Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB)...`,
          ),
        );

        await runSQL(
          db,
          `
                CREATE OR REPLACE TABLE temp_prices AS 
                SELECT * FROM read_csv('${csvPath.replace(/\\/g, "/")}', header=true, auto_detect=true);
            `,
        );

        // Export partitioned
        await runSQL(
          db,
          `
                COPY (SELECT * FROM temp_prices ORDER BY year, month, code_departement) TO '${MONTHLY_DIR.replace(/\\/g, "/")}' 
                (FORMAT PARQUET, PARTITION_BY (year, month, code_departement), OVERWRITE_OR_IGNORE);
            `,
        );

        await runSQL(db, "DROP TABLE temp_prices;");

        // Cleanup
        try {
          fs.unlinkSync(csvPath);
        } catch (e: any) {
          // ignore delete errors
          console.warn(
            chalk.yellow(`  Could not delete temp file (EBUSY?): ${e.message}`),
          );
        }
      }

      console.log(
        chalk.green(`  Successfully exported to Parquet for ${year}`),
      );

      // Upload to HF
      if (HF_REPO && HF_TOKEN) {
        console.log(chalk.blue(`  Uploading year ${year} to HuggingFace...`));
        try {
          await uploadDirectory(
            path.join(MONTHLY_DIR, `year=${year}`),
            HF_REPO,
            HF_TOKEN,
            `Import history ${year}`,
            `data/consolidated/monthly/year=${year}`,
          );
          console.log(chalk.green(`  ✅ Uploaded year ${year} to HF`));
        } catch (err: any) {
          console.error(
            chalk.red(`  ❌ Upload failed for ${year}:`),
            err.message,
          );
        }
      } else {
        console.warn(
          chalk.yellow(
            `  ⚠️ HF_REPO or HF_TOKEN missing, skipping upload for ${year}`,
          ),
        );
      }
    } catch (err) {
      console.error(
        chalk.red(`  Error in DuckDB operations for ${year}:`),
        err,
      );
      throw err;
    } finally {
      // Close DB properly
      await new Promise<void>((resolve) => {
        try {
          db.close(() => resolve());
        } catch (e) {
          console.warn("Error closing DB:", e);
          resolve();
        }
      });

      // Clean up JSONL to save space
      const jsonlPath = path.join(TEMP_DIR, `prices_${year}.jsonl`);
      if (fs.existsSync(jsonlPath)) {
        try {
          fs.unlinkSync(jsonlPath);
        } catch (e: any) {
          console.warn(
            chalk.yellow(`  Could not delete temp file (EBUSY?): ${e.message}`),
          );
        }
      }
    }
  } catch (error) {
    console.error(chalk.red(`  Error processing ${year}:`), error);
  }
}

async function main() {
  console.log(chalk.bold("Starting Historical Data Import..."));

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    await processYear(year);
  }

  // Daily processing removed as monthly files cover this
  // await processDailyData();

  console.log(chalk.gray("Cleaning up temp directory..."));
  try {
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
      // Re-create empty temp dir if needed or just leave it deleted
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
    console.log(chalk.green("Temp directory cleaned."));
  } catch (e: any) {
    console.warn(chalk.yellow(`Could not clean temp directory: ${e.message}`));
  }

  console.log(chalk.bold("Import Complete!"));
}

main().catch(console.error);
