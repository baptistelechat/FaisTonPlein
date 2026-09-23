/**
 * SCRIPT JETABLE — amorçage de `fuel_history` dans metadata.json.
 *
 * L'og:image (src/app/opengraph-image.tsx) n'affiche ses flèches d'évolution
 * qu'à partir de 7 jours d'historique. En régime normal, transform.ts empile un
 * point par run et l'historique se construit tout seul — mais il faut attendre.
 *
 * Ce script reconstruit l'historique d'un coup depuis rolling/30days. Exécuté une
 * fois le 2026-09-23 pour amorcer les 27 jours disponibles ; conservé au cas où
 * l'historique serait perdu ou corrompu et qu'il faudrait le reconstruire.
 *
 * Depuis etl/ :
 *   npx ts-node src/scripts/bootstrap-og-history.ts            # calcule et affiche (aucune écriture distante)
 *   npx ts-node src/scripts/bootstrap-og-history.ts --upload   # publie le metadata.json sur HF
 *
 * Écrit un metadata.bootstrap.json local (ignoré par git) pour inspection avant upload.
 */
import { Database } from "duckdb";
import fs from "fs";
import path from "path";
import { HF_REPO, HF_TOKEN } from "../config";
import { runSQL } from "../db";
import { uploadFilesWithRetry } from "../hf";

const FUEL_KEYS = ["Gazole", "E10", "SP95", "SP98", "E85", "GPLc"] as const;
const HISTORY_DAYS = 30;
const ROLLING_PREFIX = "data/rolling/30days";
const META_PATH = "data/latest/metadata.json";

const shouldUpload = process.argv.includes("--upload");

const baseUrl = (p: string) =>
  `https://huggingface.co/datasets/${HF_REPO}/resolve/main/${p}`;

async function listRollingFiles(): Promise<string[]> {
  const res = await fetch(
    `https://huggingface.co/api/datasets/${HF_REPO}/tree/main/${ROLLING_PREFIX}?recursive=true`,
    { signal: AbortSignal.timeout(60_000) },
  );
  if (!res.ok) throw new Error(`Listing HF échoué : HTTP ${res.status}`);
  const entries = (await res.json()) as { type: string; path: string }[];
  return entries
    .filter((e) => e.type === "file" && e.path.endsWith(".parquet"))
    .map((e) => baseUrl(e.path));
}

async function main() {
  if (!HF_REPO) throw new Error("HF_REPO manquant dans .env");

  console.log("📋 Listing des Parquet rolling sur Hugging Face...");
  const urls = await listRollingFiles();
  console.log(`   -> ${urls.length} fichiers`);
  if (urls.length === 0)
    throw new Error("Aucun Parquet trouvé dans rolling/30days");

  const db = new Database(":memory:");
  console.log("🦆 Chargement de httpfs...");
  await runSQL(db, "INSTALL httpfs; LOAD httpfs;");

  // Même garde-fou que transform.ts : les relevés hors [0.3, 5] € sont des erreurs
  // de saisie du flux data.gouv et décaleraient la moyenne nationale.
  const avgCols = FUEL_KEYS.map(
    (f) =>
      `ROUND(AVG(CASE WHEN "Prix ${f}" BETWEEN 0.3 AND 5 THEN "Prix ${f}" END), 3) AS "${f}"`,
  ).join(", ");

  const fileList = urls.map((u) => `'${u}'`).join(", ");

  console.log(
    `📊 Agrégation des moyennes nationales par jour (${urls.length} fichiers, ~10 Mo)...`,
  );
  const rows = await new Promise<Record<string, unknown>[]>(
    (resolve, reject) => {
      db.all(
        `SELECT date, ${avgCols}
       FROM read_parquet([${fileList}], union_by_name=true)
       WHERE date IS NOT NULL
       GROUP BY date
       ORDER BY date`,
        (err, r) =>
          err ? reject(err) : resolve(r as Record<string, unknown>[]),
      );
    },
  );

  const history = rows
    .map((r) => {
      const point: Record<string, string | number> = { date: String(r.date) };
      for (const fuel of FUEL_KEYS) {
        const v = r[fuel];
        if (v != null) point[fuel] = Number(v);
      }
      return point;
    })
    .filter((p) => Object.keys(p).length > 1)
    .slice(-HISTORY_DAYS);

  console.log(`\n✅ ${history.length} jours reconstruits :`);
  for (const p of history) {
    console.log(
      `   ${p.date}  ` + FUEL_KEYS.map((f) => `${f} ${p[f] ?? "—"}`).join("  "),
    );
  }

  // Fusion avec le metadata.json en place : on n'écrase que fuel_history.
  console.log("\n📥 Récupération du metadata.json actuel...");
  const metaRes = await fetch(baseUrl(META_PATH), {
    signal: AbortSignal.timeout(30_000),
  });
  if (!metaRes.ok)
    throw new Error(`metadata.json illisible : HTTP ${metaRes.status}`);
  const meta = (await metaRes.json()) as Record<string, unknown>;

  const merged: Record<string, unknown> = { ...meta, fuel_history: history };

  // fuel_stats peut manquer si transform.ts n'a pas encore tourné avec la nouvelle
  // version : on le dérive du dernier point pour que l'og:image soit complète tout de suite.
  if (!merged.fuel_stats && history.length > 0) {
    const last = history[history.length - 1];
    const stats: Record<string, { avg: number | null; stations: number }> = {};
    for (const fuel of FUEL_KEYS) {
      stats[fuel] = {
        avg: typeof last[fuel] === "number" ? (last[fuel] as number) : null,
        stations: 0, // inconnu ici, transform.ts le renseignera au prochain run
      };
    }
    merged.fuel_stats = stats;
    console.log(
      "   -> fuel_stats absent : dérivé du dernier jour de l'historique",
    );
  }

  const outPath = path.join(process.cwd(), "metadata.bootstrap.json");
  fs.writeFileSync(outPath, JSON.stringify(merged, null, 2));
  console.log(`\n💾 Écrit localement : ${outPath}`);

  if (!shouldUpload) {
    console.log(
      "\n⏸️  Aucune écriture distante (relancer avec --upload pour publier).",
    );
    return;
  }

  if (!HF_TOKEN) throw new Error("HF_TOKEN manquant dans .env");
  console.log("\n📤 Publication sur Hugging Face...");
  await uploadFilesWithRetry({
    repo: { type: "dataset", name: HF_REPO },
    credentials: { accessToken: HF_TOKEN },
    files: [
      {
        path: META_PATH,
        content: new Blob([JSON.stringify(merged, null, 2)], {
          type: "application/json",
        }),
      },
    ],
    commitTitle: "Bootstrap fuel_history for dynamic og:image",
  });
  console.log("✅ metadata.json publié.");
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
