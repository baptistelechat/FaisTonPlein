import * as hub from "@huggingface/hub";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { HF_REPO, HF_TOKEN } from "./config";

type RepoDesignation = {
  type: "dataset";
  name: string;
};

const toRepo = (repoName: string): RepoDesignation => ({
  type: "dataset",
  name: repoName,
});

export async function ensureRepoExists() {
  if (!HF_REPO || !HF_TOKEN) {
    throw new Error("Missing HF_REPO or HF_TOKEN");
  }

  try {
    await (hub as any).createRepo({
      repo: toRepo(HF_REPO),
      accessToken: HF_TOKEN,
      private: false,
    });
  } catch (err: any) {
    const message = String(err?.message ?? err);
    if (
      message.includes("409") ||
      message.toLowerCase().includes("already exists")
    ) {
      return;
    }
    throw err;
  }
}

export async function uploadDirectory(
  directoryPath: string,
  repoName: string,
  accessToken: string,
  commitTitle?: string,
  pathInRepo?: string,
) {
  const repo = toRepo(repoName);
  const folderUrl = pathToFileURL(directoryPath);

  await (hub as any).uploadFiles({
    repo,
    accessToken,
    files: pathInRepo
      ? [{ path: pathInRepo, content: folderUrl }]
      : [folderUrl],
    commitTitle,
  });
}

export async function uploadFilesWithRetry(args: {
  repo: RepoDesignation;
  credentials: { accessToken: string };
  files: Array<
    | { path: string; content: Blob }
    | URL
    | { path: string; content: URL | Blob }
  >;
  commitTitle?: string;
  maxRetries?: number;
  retryDelayMs?: number;
}) {
  const maxRetries = args.maxRetries ?? 3;
  const retryDelayMs = args.retryDelayMs ?? 1000;

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await (hub as any).uploadFiles({
        repo: args.repo,
        accessToken: args.credentials.accessToken,
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
  const normalizedPrefix = prefix.replace(/^\/+/, "").replace(/\/+$/, "");
  const hfPrefix = `hf://datasets/${repoName}/`;

  const results: string[] = [];
  for await (const fileInfo of (hub as any).listFiles({ repo, accessToken })) {
    const filePath = String(fileInfo?.path ?? "");
    if (!filePath) continue;
    if (!filePath.startsWith(normalizedPrefix)) continue;
    if (!filePath.endsWith(".parquet")) continue;
    results.push(`${hfPrefix}${filePath}`);
  }

  return results;
}

export async function downloadFilesToLocal(
  repoName: string,
  accessToken: string,
  relativePaths: string[],
  destDir: string,
  maxConcurrency: number = 5,
): Promise<string[]> {
  const repo = toRepo(repoName);
  fs.mkdirSync(destDir, { recursive: true });

  const queue = [...relativePaths];
  const downloaded: string[] = [];

  const worker = async () => {
    while (queue.length > 0) {
      const relPath = queue.shift();
      if (!relPath) continue;

      const response = await (hub as any).downloadFile({
        repo,
        accessToken,
        path: relPath,
      });

      if (!response || typeof response.arrayBuffer !== "function") {
        continue;
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      const outPath = path.join(destDir, relPath);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, bytes);
      downloaded.push(outPath);
    }
  };

  const workers = Array.from({ length: Math.max(1, maxConcurrency) }, () =>
    worker(),
  );
  await Promise.all(workers);

  return downloaded;
}
