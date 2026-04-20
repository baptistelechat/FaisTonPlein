import {
  CACHE_MAX_AGE_MS,
  DEPT_CACHE_DB_NAME,
  DEPT_CACHE_DB_VERSION,
  DEPT_CACHE_STORE_NAME,
  HF_ROLLING_BASE_URL,
} from "@/lib/constants";
import type { AsyncDuckDB } from "@duckdb/duckdb-wasm";

export type DeptCacheEntry = {
  dept: string;
  buffer: ArrayBuffer;
  cachedAt: number;
  size: number;
};

let dbPromise: Promise<IDBDatabase> | null = null;

const openCacheDB = (): Promise<IDBDatabase> => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DEPT_CACHE_DB_NAME, DEPT_CACHE_DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(DEPT_CACHE_STORE_NAME)) {
          db.createObjectStore(DEPT_CACHE_STORE_NAME, { keyPath: "dept" });
        }
      };
      req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
    });
  }
  return dbPromise;
};

export const getDeptCacheEntry = async (
  dept: string,
): Promise<DeptCacheEntry | null> => {
  const idb = await openCacheDB();
  return new Promise((resolve) => {
    const tx = idb.transaction(DEPT_CACHE_STORE_NAME, "readonly");
    const req = tx.objectStore(DEPT_CACHE_STORE_NAME).get(dept);
    req.onsuccess = () => resolve((req.result as DeptCacheEntry) ?? null);
    req.onerror = () => resolve(null);
  });
};

export const setCachedDeptEntry = async (
  dept: string,
  buffer: ArrayBuffer,
  size: number,
): Promise<void> => {
  const idb = await openCacheDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(DEPT_CACHE_STORE_NAME, "readwrite");
    tx.objectStore(DEPT_CACHE_STORE_NAME).put({
      dept,
      buffer,
      cachedAt: Date.now(),
      size,
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const clearDeptCache = async (dept: string): Promise<void> => {
  const idb = await openCacheDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(DEPT_CACHE_STORE_NAME, "readwrite");
    tx.objectStore(DEPT_CACHE_STORE_NAME).delete(dept);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const clearAllDeptCache = async (): Promise<void> => {
  const idb = await openCacheDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(DEPT_CACHE_STORE_NAME, "readwrite");
    tx.objectStore(DEPT_CACHE_STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const isCacheValid = (entry: DeptCacheEntry): boolean =>
  Date.now() - entry.cachedAt < CACHE_MAX_AGE_MS;

export const getDeptLocalFileName = (dept: string): string =>
  `latest_${dept}.parquet`;

export const registerCachedDeptInDuckDB = async (
  db: AsyncDuckDB,
  dept: string,
  buffer: ArrayBuffer,
): Promise<void> => {
  await db.registerFileBuffer(
    getDeptLocalFileName(dept),
    new Uint8Array(buffer),
  );
};

// ─── Rolling cache (TTL 24h) ───────────────────────────────────────────────

export const getDeptRollingLocalFileName = (dept: string): string =>
  `rolling_${dept}.parquet`;

export const getRollingDeptCacheEntry = (
  dept: string,
): Promise<DeptCacheEntry | null> => getDeptCacheEntry(`rolling_${dept}`);

export const setCachedRollingDeptEntry = (
  dept: string,
  buffer: ArrayBuffer,
  size: number,
): Promise<void> => setCachedDeptEntry(`rolling_${dept}`, buffer, size);

/**
 * Le cache rolling est valide uniquement s'il a été téléchargé aujourd'hui
 * (même date calendaire). L'ETL génère de nouvelles données quotidiennement,
 * donc tout cache d'un jour précédent est potentiellement obsolète.
 */
export const isRollingCacheValid = (entry: DeptCacheEntry): boolean => {
  const cachedDate = new Date(entry.cachedAt);
  const now = new Date();
  return (
    cachedDate.getUTCFullYear() === now.getUTCFullYear() &&
    cachedDate.getUTCMonth() === now.getUTCMonth() &&
    cachedDate.getUTCDate() === now.getUTCDate()
  );
};

export const registerRollingCachedDeptInDuckDB = async (
  db: AsyncDuckDB,
  dept: string,
  buffer: ArrayBuffer,
): Promise<void> => {
  await db.registerFileBuffer(
    getDeptRollingLocalFileName(dept),
    new Uint8Array(buffer),
  );
};

/**
 * Retourne la source Parquet rolling pour un département :
 * - fichier local DuckDB VFS si le cache IndexedDB est valide (zéro appel réseau)
 * - URL HuggingFace sinon (fallback)
 */
export const getRollingParquetSource = async (
  db: AsyncDuckDB,
  dept: string,
): Promise<string> => {
  const entry = await getRollingDeptCacheEntry(dept);
  if (entry && isRollingCacheValid(entry)) {
    try {
      await registerRollingCachedDeptInDuckDB(db, dept, entry.buffer);
      return getDeptRollingLocalFileName(dept);
    } catch {
      // Enregistrement échoué → fallback HF
    }
  }
  return `${HF_ROLLING_BASE_URL}/code_departement=${dept}/data_0.parquet`;
};
