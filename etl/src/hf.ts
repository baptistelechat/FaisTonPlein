import * as hub from "@huggingface/hub";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import { HF_REPO, HF_TOKEN } from "./config";

type RepoDesignation = { type: "dataset"; name: string };

const toRepo = (repoName: string): RepoDesignation => ({
  type: "dataset",
  name: repoName,
});

export async function ensureRepoExists() {
  if (!HF_REPO || !HF_TOKEN) throw new Error("Missing HF_REPO or HF_TOKEN");

  try {
    await hub.createRepo({
      repo: toRepo(HF_REPO),
      credentials: { accessToken: HF_TOKEN },
      private: false,
    });
  } catch (err: unknown) {
    const message = String(err instanceof Error ? err.message : err);
    const alreadyExists =
      message.includes("409") ||
      message.toLowerCase().includes("already exists") ||
      message.toLowerCase().includes("already created");
    if (!alreadyExists) throw err;
  }
}

function scanDirectory(
  dir: string,
  baseDir: string,
): Array<{ path: string; content: Blob }> {
  const files: Array<{ path: string; content: Blob }> = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...scanDirectory(fullPath, baseDir));
    } else {
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
      files.push({
        path: relPath,
        content: new Blob([fs.readFileSync(fullPath)]),
      });
    }
  }
  return files;
}

export async function uploadDirectory(
  directoryPath: string,
  repoName: string,
  accessToken: string,
  commitTitle?: string,
  pathPrefix?: string,
) {
  const repo = toRepo(repoName);
  const prefix =
    pathPrefix?.replace(/^\/+|\/+$/g, "") ?? path.basename(directoryPath);
  const files = scanDirectory(directoryPath, directoryPath).map((f) => ({
    ...f,
    path: `${prefix}/${f.path}`,
  }));

  await hub.uploadFiles({
    repo,
    credentials: { accessToken },
    files,
    commitTitle,
  });
}

export async function uploadFilesWithRetry(args: {
  repo: RepoDesignation;
  credentials: { accessToken: string };
  files: Array<{ path: string; content: Blob }>;
  commitTitle?: string;
  maxRetries?: number;
  retryDelayMs?: number;
}) {
  const { maxRetries = 3, retryDelayMs = 1000 } = args;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await hub.uploadFiles({
        repo: args.repo,
        credentials: args.credentials,
        files: args.files,
        commitTitle: args.commitTitle,
      });
      return;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }
  throw lastError;
}

export async function listParquetFiles(
  repoName: string,
  accessToken: string,
  prefix: string,
): Promise<string[]> {
  const repo = toRepo(repoName);
  const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, "");
  const hfPrefix = `hf://datasets/${repoName}/`;
  const results: string[] = [];

  for await (const fileInfo of hub.listFiles({
    repo,
    credentials: { accessToken },
    path: normalizedPrefix, // filtre côté serveur
    recursive: true, // liste les sous-dossiers (défaut = false)
  })) {
    const filePath = String(fileInfo?.path ?? "");
    if (filePath.endsWith(".parquet")) {
      results.push(`${hfPrefix}${filePath}`);
    }
  }
  return results;
}

const RATE_LIMIT_RETRY_DELAYS_MS = [60_000, 120_000, 300_000]; // 1min, 2min, 5min
// Délai minimum entre deux requêtes par worker : 3 workers × (1000ms/300ms) = ~10 req/s = 3000 req/5min
const REQUEST_DELAY_MS = 300;

async function downloadFileWithRetry(
  repo: RepoDesignation,
  accessToken: string,
  relPath: string,
): Promise<Buffer> {
  for (
    let attempt = 0;
    attempt <= RATE_LIMIT_RETRY_DELAYS_MS.length;
    attempt++
  ) {
    try {
      const response = await hub.downloadFile({
        repo,
        credentials: { accessToken },
        path: relPath,
      });
      if (!response) throw new Error(`Empty response for ${relPath}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (err: unknown) {
      const is429 =
        (err instanceof Error && err.message.includes("429")) ||
        (typeof err === "object" &&
          err !== null &&
          (err as { statusCode?: number }).statusCode === 429);

      if (is429 && attempt < RATE_LIMIT_RETRY_DELAYS_MS.length) {
        const baseDelay = RATE_LIMIT_RETRY_DELAYS_MS[attempt];
        // Jitter aléatoire jusqu'à 15s pour éviter que tous les workers reessaient en même temps
        const jitter = Math.floor(Math.random() * 15_000);
        const delay = baseDelay + jitter;
        console.warn(
          chalk.yellow(
            `   ⏳ Rate limited (429) — waiting ${Math.round(delay / 1000)}s before retry ${attempt + 1}/${RATE_LIMIT_RETRY_DELAYS_MS.length}...`,
          ),
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Max retries exceeded for ${relPath}`);
}

export async function downloadFilesToLocal(
  repoName: string,
  accessToken: string,
  relativePaths: string[],
  destDir: string,
  maxConcurrency = 5,
): Promise<string[]> {
  const repo = toRepo(repoName);
  fs.mkdirSync(destDir, { recursive: true });

  const queue = [...relativePaths];
  const downloaded: string[] = [];

  const worker = async (workerIndex: number) => {
    // Décalage de démarrage pour éviter le burst initial (tous les workers à T=0)
    await new Promise((resolve) =>
      setTimeout(resolve, workerIndex * REQUEST_DELAY_MS),
    );

    while (queue.length > 0) {
      const relPath = queue.shift();
      if (!relPath) continue;

      const bytes = await downloadFileWithRetry(repo, accessToken, relPath);
      const outPath = path.join(destDir, relPath);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, bytes);
      downloaded.push(outPath);

      // Throttle pour rester sous la limite HF (5000 req/5min)
      await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
    }
  };

  await Promise.all(
    Array.from({ length: Math.max(1, maxConcurrency) }, (_, i) => worker(i)),
  );
  return downloaded;
}
