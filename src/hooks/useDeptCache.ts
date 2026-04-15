"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useDuckDB } from "@/components/DuckDBProvider";
import { useAppStore } from "@/store/useAppStore";
import { HF_LATEST_BASE_URL, HF_ROLLING_BASE_URL } from "@/lib/constants";
import {
  clearAllDeptCache,
  getRollingDeptCacheEntry,
  isRollingCacheValid,
  registerCachedDeptInDuckDB,
  setCachedDeptEntry,
  setCachedRollingDeptEntry,
} from "@/lib/deptCache";
import { downloadDeptParquet } from "@/lib/deptDownload";

export function useDeptCache() {
  const { db } = useDuckDB();
  const setCachedDeptMeta = useAppStore((s) => s.setCachedDeptMeta);
  const setCachedRollingDeptMeta = useAppStore(
    (s) => s.setCachedRollingDeptMeta,
  );
  const clearAllCachedDepts = useAppStore((s) => s.clearAllCachedDepts);
  const setDownloadingDept = useAppStore((s) => s.setDownloadingDept);
  const downloadingDepts = useAppStore((s) => s.downloadingDepts);
  const progressByDept = useAppStore((s) => s.progressByDept);

  const cacheInBackground = useCallback(
    async (dept: string) => {
      if (!db) return;
      // Éviter le double téléchargement — lecture directe du store pour éviter les stale closures
      if (useAppStore.getState().downloadingDepts.includes(dept)) return;

      setDownloadingDept(dept, 0);

      const latestUrl = `${HF_LATEST_BASE_URL}/code_departement=${dept}/data_0.parquet`;
      const rollingUrl = `${HF_ROLLING_BASE_URL}/code_departement=${dept}/data_0.parquet`;

      try {
        // Vérifier si le rolling a besoin d'être téléchargé avant de lancer les DL en parallèle
        const existingRolling = await getRollingDeptCacheEntry(dept);
        const shouldCacheRolling =
          !existingRolling || !isRollingCacheValid(existingRolling);

        // Latest + rolling téléchargés en parallèle pour minimiser le temps d'attente
        const [latestResult, rollingResult] = await Promise.allSettled([
          downloadDeptParquet(latestUrl, (ratio) =>
            setDownloadingDept(dept, ratio),
          ),
          shouldCacheRolling
            ? downloadDeptParquet(rollingUrl, () => {})
            : Promise.resolve(null),
        ]);

        // Traiter latest
        if (latestResult.status === "fulfilled") {
          const buffer = latestResult.value;
          const size = buffer.byteLength;
          await setCachedDeptEntry(dept, buffer, size);
          await registerCachedDeptInDuckDB(db, dept, buffer);
          setCachedDeptMeta(dept, { cachedAt: Date.now(), size });
        } else {
          throw latestResult.reason;
        }

        // Traiter rolling (silencieux — échec non bloquant)
        if (
          rollingResult.status === "fulfilled" &&
          rollingResult.value !== null
        ) {
          const rollingBuffer = rollingResult.value;
          const rollingSize = rollingBuffer.byteLength;
          await setCachedRollingDeptEntry(dept, rollingBuffer, rollingSize);
          setCachedRollingDeptMeta(dept, {
            cachedAt: Date.now(),
            size: rollingSize,
          });
        }
      } catch {
        // Silencieux — le cache est une optimisation, pas une fonctionnalité critique
      } finally {
        setDownloadingDept(dept, null);
      }
    },
    [db, setCachedDeptMeta, setCachedRollingDeptMeta, setDownloadingDept],
  );

  /**
   * Télécharge uniquement le rolling d'un département si absent ou expiré.
   * Appelé indépendamment de cacheInBackground pour couvrir le cas où
   * le latest est encore valide mais le rolling n'a jamais été mis en cache
   * (utilisateurs existants, premier démarrage post-déploiement).
   */
  const cacheRollingInBackground = useCallback(
    async (dept: string) => {
      if (!db) return;
      const rollingUrl = `${HF_ROLLING_BASE_URL}/code_departement=${dept}/data_0.parquet`;
      try {
        const rollingBuffer = await downloadDeptParquet(rollingUrl, () => {});
        const rollingSize = rollingBuffer.byteLength;
        await setCachedRollingDeptEntry(dept, rollingBuffer, rollingSize);
        setCachedRollingDeptMeta(dept, {
          cachedAt: Date.now(),
          size: rollingSize,
        });
      } catch {
        // Silencieux
      }
    },
    [db, setCachedRollingDeptMeta],
  );

  const resetApp = useCallback(async () => {
    await clearAllDeptCache();
    clearAllCachedDepts();
    localStorage.removeItem("faistonplein-preferences");
    toast.info("Réinitialisation…");
    window.location.reload();
  }, [clearAllCachedDepts]);

  return {
    downloadingDepts,
    progressByDept,
    cacheInBackground,
    cacheRollingInBackground,
    resetApp,
  };
}
