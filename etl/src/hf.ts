import { createRepo, uploadFiles, listFiles } from "@huggingface/hub";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import { HF_REPO, HF_TOKEN } from "./config";

/**
 * Uploads files to Hugging Face with retry logic.
 */
export async function uploadFilesWithRetry(
  params: Parameters<typeof uploadFiles>[0],
  retries = 5,
  delay = 2000,
) {
  for (let i = 0; i < retries; i++) {
    try {
      return await uploadFiles(params);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      const isLastAttempt = i === retries - 1;
      if (isLastAttempt) {
        console.error(
          chalk.red(`❌ Upload failed after ${retries} attempts: ${error.message}`),
        );
        throw error;
      }

      console.warn(
        chalk.yellow(
          `⚠️ Upload failed (attempt ${i + 1}/${retries}): ${error.message}`,
        ),
      );
      console.warn(chalk.yellow(`⏳ Retrying in ${delay / 1000}s...`));
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
}

export async function ensureRepoExists() {
  if (!HF_TOKEN || !HF_REPO) return;
  try {
    console.log(chalk.blue(`🔍 Checking if repo ${HF_REPO} exists...`));
    await createRepo({
      repo: { type: "dataset", name: HF_REPO },
      credentials: { accessToken: HF_TOKEN },
      private: false, // Public by default
    });
    console.log(chalk.green(`✅ Repo ${HF_REPO} created.`));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // If error is "repo already exists", we ignore it.
    const errorMsg = error?.message || String(error);
    if (errorMsg.includes("409") || errorMsg.includes("exists")) {
      console.log(
        chalk.green(`✅ Repo ${HF_REPO} already exists (or access confirmed).`),
      );
    } else {
      console.warn(
        chalk.yellow(
          `⚠️ Warning: Could not create repo (might already exist or permission issue): ${errorMsg}`,
        ),
      );
    }
  }
}

/**
 * Lists all parquet files in a specific directory of the HF dataset.
 * Helps to avoid DuckDB globbing errors (HTTP 429) by fetching file list via API first.
 */
export async function listParquetFiles(
  repo: string,
  token: string,
  pathPrefix: string
): Promise<string[]> {
  const files: string[] = [];
  try {
    const iterator = listFiles({
      repo: { type: "dataset", name: repo },
      credentials: { accessToken: token },
      path: pathPrefix,
      recursive: true,
    });

    for await (const file of iterator) {
      if (file.path.endsWith(".parquet")) {
        files.push(`hf://datasets/${repo}/${file.path}`);
      }
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.warn(chalk.yellow(`⚠️  Failed to list files in ${pathPrefix}: ${err.message}`));
  }
  return files;
}

export async function uploadDirectory(dir: string, repo: string, token: string, commitTitle: string = "Update data", targetPath: string = "data") {
  console.log(`⬆️ Uploading to Hugging Face (${repo})...`);

  // Prepare files for upload
  const filesToUpload: { path: string; content: Blob }[] = [];

  function scanDir(currentDir: string, baseDir: string) {
    if (!fs.existsSync(currentDir)) return;
    
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      // Ensure path uses forward slashes for HF
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, "/");

      if (entry.isDirectory()) {
        scanDir(fullPath, baseDir);
      } else {
        filesToUpload.push({
          path: `${targetPath}/${relPath}`.replace(/\/+/g, '/'), // Avoid double slashes
          content: new Blob([fs.readFileSync(fullPath)]),
        });
      }
    }
  }

  // Scan the directory
  scanDir(dir, dir);

  if (filesToUpload.length === 0) {
    console.log(chalk.yellow("⚠️ No files found to upload."));
    return;
  }

  console.log(
    chalk.green(`✅ Found ${filesToUpload.length} files to upload.`),
  );

  await uploadFilesWithRetry({
    repo: { type: "dataset", name: repo },
    credentials: { accessToken: token },
    files: filesToUpload,
    commitTitle: commitTitle,
  });
}
