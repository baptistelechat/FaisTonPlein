"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useDuckDB } from "@/components/DuckDBProvider";
import { useAppStore } from "@/store/useAppStore";
import { HF_LATEST_BASE_URL } from "@/lib/constants";
import {
  clearAllDeptCache,
  registerCachedDeptInDuckDB,
  setCachedDeptEntry,
} from "@/lib/deptCache";
import { downloadDeptParquet } from "@/lib/deptDownload";

export function useDeptCache() {
  const { db } = useDuckDB();
  const setCachedDeptMeta = useAppStore((s) => s.setCachedDeptMeta);
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

      const url = `${HF_LATEST_BASE_URL}/code_departement=${dept}/data_0.parquet`;
      try {
        const buffer = await downloadDeptParquet(url, (ratio) => {
          setDownloadingDept(dept, ratio);
        });
        const size = buffer.byteLength;
        await setCachedDeptEntry(dept, buffer, size);
        await registerCachedDeptInDuckDB(db, dept, buffer);
        setCachedDeptMeta(dept, { cachedAt: Date.now(), size });
        // Pas de toast — transparent pour l'utilisateur
      } catch {
        // Silencieux — le cache est une optimisation, pas une fonctionnalité critique
      } finally {
        setDownloadingDept(dept, null);
      }
    },
    [db, setCachedDeptMeta, setDownloadingDept],
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
    resetApp,
  };
}
