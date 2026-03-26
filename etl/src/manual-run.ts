import chalk from "chalk";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

type RepoDesignation = {
  type: "dataset";
  name: string;
};

const toRepo = (repoName: string): RepoDesignation => ({
  type: "dataset",
  name: repoName,
});

const patchManualHfCompat = () => {
  const hub = require("@huggingface/hub") as any;
  const hf = require("./hf") as any;

  hf.ensureRepoExists = async () => {
    const { HF_REPO, HF_TOKEN } = require("./config") as any;
    if (!HF_REPO || !HF_TOKEN) {
      throw new Error("Missing HF_REPO or HF_TOKEN");
    }

    try {
      await hub.createRepo({
        repo: toRepo(HF_REPO),
        credentials: { accessToken: HF_TOKEN },
        private: false,
      });
    } catch (err: any) {
      const statusCode = Number(err?.statusCode ?? err?.response?.status ?? NaN);
      const message = String(err?.message ?? err);
      if (
        statusCode === 409 ||
        message.includes("409") ||
        message.toLowerCase().includes("already exists") ||
        message.toLowerCase().includes("already created")
      ) {
        return;
      }
      throw err;
    }
  };

  hf.uploadDirectory = async (
    directoryPath: string,
    repoName: string,
    accessToken: string,
    commitTitle?: string,
    pathInRepo?: string,
  ) => {
    const repo = toRepo(repoName);
    const basePrefix = pathInRepo
      ? pathInRepo.replace(/^\/+/, "").replace(/\/+$/, "")
      : path.basename(directoryPath);

    const files: Array<{ path: string; content: Blob }> = [];

    const scanDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
          continue;
        }

        const relPath = path.relative(directoryPath, fullPath).replace(/\\/g, "/");
        const repoPath = `${basePrefix}/${relPath}`.replace(/\/+/g, "/");
        files.push({
          path: repoPath,
          content: new Blob([fs.readFileSync(fullPath)]),
        });
      }
    };

    scanDir(directoryPath);

    await hub.uploadFiles({
      repo,
      credentials: { accessToken },
      files,
      commitTitle,
    });
  };

  hf.uploadFilesWithRetry = async (args: {
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
  }) => {
    const maxRetries = args.maxRetries ?? 3;
    const retryDelayMs = args.retryDelayMs ?? 1000;

    let lastError: unknown = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await hub.uploadFiles({
          repo: args.repo,
          credentials: args.credentials,
          files: args.files,
          commitTitle: args.commitTitle,
        });
        return;
      } catch (err: any) {
        lastError = err;
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
      }
    }

    throw lastError;
  };

  hf.listParquetFiles = async (
    repoName: string,
    accessToken: string,
    prefix: string,
  ): Promise<string[]> => {
    const repo = toRepo(repoName);
    const normalizedPrefix = prefix.replace(/^\/+/, "").replace(/\/+$/, "");
    const hfPrefix = `hf://datasets/${repoName}/`;

    const results: string[] = [];
    for await (const fileInfo of hub.listFiles({
      repo,
      credentials: { accessToken },
    })) {
      const filePath = String(fileInfo?.path ?? "");
      if (!filePath) continue;
      if (!filePath.startsWith(normalizedPrefix)) continue;
      if (!filePath.endsWith(".parquet")) continue;
      results.push(`${hfPrefix}${filePath}`);
    }

    return results;
  };

  hf.downloadFilesToLocal = async (
    repoName: string,
    accessToken: string,
    relativePaths: string[],
    destDir: string,
    maxConcurrency: number = 5,
  ): Promise<string[]> => {
    const repo = toRepo(repoName);
    fs.mkdirSync(destDir, { recursive: true });

    const queue = [...relativePaths];
    const downloaded: string[] = [];

    const worker = async () => {
      while (queue.length > 0) {
        const relPath = queue.shift();
        if (!relPath) continue;

        const response = await hub.downloadFile({
          repo,
          credentials: { accessToken },
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
  };
};

(async () => {
  console.log(chalk.bgBlue("🚀 Manual Pipeline Trigger (ETL + Consolidation)"));
  try {
    patchManualHfCompat();
    const [{ runETL }, { runConsolidationService }] = await Promise.all([
      import("./pipeline"),
      import("./consolidate"),
    ]);

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
