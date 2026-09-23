/**
 * Amorçage / réparation manuelle de `fuel_history` dans metadata.json.
 *
 * L'og:image (src/app/opengraph-image.tsx) n'affiche ses flèches d'évolution
 * qu'à partir de 7 jours d'historique. En régime normal, transform.ts empile un
 * point par run et reconstruit lui-même l'historique via reconstructFuelHistory()
 * (../history.ts) s'il ne parvient pas à relire celui du run précédent — ce script
 * ne devrait donc plus être nécessaire qu'en dépannage manuel (ex. vérifier l'état
 * publié sans attendre le prochain run ETL).
 *
 * Exécuté une première fois le 2026-09-23 pour amorcer les 27 jours disponibles.
 *
 * Depuis etl/ :
 *   npx ts-node src/scripts/bootstrap-og-history.ts            # calcule et affiche (aucune écriture distante)
 *   npx ts-node src/scripts/bootstrap-og-history.ts --upload   # publie le metadata.json sur HF
 *
 * Écrit un metadata.bootstrap.json local (ignoré par git) pour inspection avant upload.
 */
import fs from "fs";
import path from "path";
import { HF_REPO, HF_TOKEN } from "../config";
import { initDB } from "../db";
import { FUEL_KEYS, reconstructFuelHistory } from "../history";
import { uploadFilesWithRetry } from "../hf";

const META_PATH = "data/latest/metadata.json";

const shouldUpload = process.argv.includes("--upload");

const baseUrl = (p: string) =>
  `https://huggingface.co/datasets/${HF_REPO}/resolve/main/${p}`;

async function main() {
  if (!HF_REPO) throw new Error("HF_REPO manquant dans .env");

  const db = await initDB();
  console.log(
    "📊 Agrégation des moyennes nationales par jour depuis rolling/30days...",
  );
  const history = await reconstructFuelHistory(db);
  db.close();

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
