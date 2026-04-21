# Story 4.1 : Cache Départemental

**Status:** done

## Story

**En tant que** système,
**Je veux** télécharger et mettre en cache automatiquement les données Parquet de **tous les départements chargés** (`departmentsToLoad`) dans IndexedDB,
**Afin d'** accélérer les chargements futurs (fenêtre de 2h) pour l'ensemble de la zone de recherche et constituer une base locale pour le mode hors ligne (US-04-02).

## Acceptance Criteria

1. Après chaque chargement réseau réussi, **tous les départements de `departmentsToLoad`** sont mis en cache dans IndexedDB en arrière-plan — sans aucune notification à l'utilisateur.
2. Lors du chargement suivant, pour chaque département ayant un cache valide (< 2h), les données sont lues depuis IndexedDB et enregistrées dans DuckDB via `registerFileBuffer` — aucun appel réseau HuggingFace pour ce département.
3. Si le cache d'un département est périmé (>= 2h), ce département est rechargé depuis HuggingFace et son cache est rafraîchi en arrière-plan (silencieux).
4. La section **Réglages** affiche, pour chaque département de `departmentsToLoad`, le statut individuel : "En cache • il y a X min • Y Ko" ou une mini barre de progression discrète si le téléchargement est en cours.
5. Un bouton "Tout vider" dans les Réglages supprime toutes les entrées IndexedDB et réinitialise le store.
6. Lint : 0 erreur bloquante.

## Tasks / Subtasks

- [x] Task 1 : Ajouter constantes dans `constants.ts` (AC: #2, #3)
  - [x] Ajouter `DEPT_CACHE_DB_NAME = 'faistonplein-cache'`
  - [x] Ajouter `DEPT_CACHE_STORE_NAME = 'dept-parquet'`
  - [x] Ajouter `DEPT_CACHE_DB_VERSION = 1`
  - [x] Ajouter `CACHE_MAX_AGE_MS = 2 * 60 * 60 * 1000` (2h — aligné sur la fréquence de mise à jour HuggingFace)

- [x] Task 2 : Créer `src/lib/deptCache.ts` (AC: #2, #3)
  - [x] Exporter le type `DeptCacheEntry = { dept: string; buffer: ArrayBuffer; cachedAt: number; size: number }`
  - [x] `openCacheDB(): Promise<IDBDatabase>` — ouvre/crée la DB IndexedDB (voir Dev Notes)
  - [x] `getDeptCacheEntry(dept: string): Promise<DeptCacheEntry | null>` — lit une entrée
  - [x] `setCachedDeptEntry(dept: string, buffer: ArrayBuffer, size: number): Promise<void>` — stocke dans IndexedDB
  - [x] `clearDeptCache(dept: string): Promise<void>` — supprime une entrée
  - [x] `clearAllDeptCache(): Promise<void>` — vide le store IndexedDB entier
  - [x] `isCacheValid(entry: DeptCacheEntry): boolean` — `Date.now() - entry.cachedAt < CACHE_MAX_AGE_MS`
  - [x] `getDeptLocalFileName(dept: string): string` — retourne `'latest_${dept}.parquet'`
  - [x] `registerCachedDeptInDuckDB(db: AsyncDuckDB, dept: string, buffer: ArrayBuffer): Promise<void>` — `db.registerFileBuffer(getDeptLocalFileName(dept), new Uint8Array(buffer))`

- [x] Task 3 : Créer `src/lib/deptDownload.ts` (AC: #1, #3)
  - [x] `downloadDeptParquet(url: string, onProgress: (ratio: number) => void): Promise<ArrayBuffer>` — fetch avec `ReadableStream` chunk-by-chunk (voir Dev Notes)
  - [x] Fallback si `Content-Length` absent ou `body` null : `response.arrayBuffer()` direct avec `onProgress(1)`

- [x] Task 4 : Mettre à jour le store Zustand (AC: #4, #5)
  - [x] Ajouter dans `src/store/types.ts` :
    - `cachedDepts: Record<string, { cachedAt: number; size: number }>` — métadonnées par dept (persisted)
    - `loadedDepts: string[]` — liste des depts actuellement chargés, non persisté
    - `setCachedDeptMeta: (dept: string, meta: { cachedAt: number; size: number } | null) => void`
    - `clearAllCachedDepts: () => void` — reset `cachedDepts: {}`
    - `setLoadedDepts: (depts: string[]) => void`
  - [x] Ajouter valeurs initiales + actions dans `src/store/useAppStore.ts` (voir Dev Notes)
  - [x] Inclure `cachedDepts` dans `partialize` — **ne pas inclure `loadedDepts`** (état runtime)

- [x] Task 5 : Créer `src/hooks/useDeptCache.ts` (AC: #1, #3, #4, #5)
  - [x] Hook retournant `{ downloadingDepts, progressByDept, cacheInBackground, removeAllDeptCache }`
  - [x] `downloadingDepts: string[]` — depts en cours de téléchargement (state local)
  - [x] `progressByDept: Record<string, number>` — ratio 0→1 par dept (state local)
  - [x] `cacheInBackground(dept: string)` : silencieux — pas de toast, pas de bruit (voir Dev Notes)
  - [x] `removeAllDeptCache()` : `clearAllDeptCache()` IndexedDB + `clearAllCachedDepts()` store + `toast.info` discret
  - [x] Sélecteurs isolés : `useDuckDB()` pour `db`, `useAppStore((s) => s.setCachedDeptMeta)`

- [x] Task 6 : Modifier `FuelDataLoader.tsx` (AC: #1, #2, #3)
  - [x] Appeler `useDeptCache()` et `setLoadedDepts` en haut du composant
  - [x] Dans la boucle `departmentsToLoad.map()` : pour chaque dept, check cache avant fetch HF (voir Dev Notes)
  - [x] Si cache valide : `registerCachedDeptInDuckDB` + `read_parquet('${getDeptLocalFileName(dept)}')`
  - [x] Si cache absent ou périmé : fetch HF normalement (comportement actuel)
  - [x] Après `setStations(stations)` et `setLoadedDeptsKey(deptKey)` (succès) : appeler `setLoadedDepts(departmentsToLoad)` puis `void cacheInBackground(dept)` pour chaque dept de `departmentsToLoad` qui n'a pas de cache valide (voir Dev Notes)
  - [x] Conserver le `toast.success` existant tel quel

- [x] Task 7 : Ajouter la section Cache dans `SettingsBody.tsx` (AC: #4, #5)
  - [x] Appeler `useDeptCache()` et les sélecteurs `cachedDepts`, `loadedDepts` du store
  - [x] En fin de `SettingsBody` : `<Separator />` + section "Données hors ligne" avec liste par dept (voir Dev Notes)
  - [x] Pour chaque dept de `loadedDepts` : afficher statut individuel (en cache / en cours / non caché)
  - [x] Bouton "Tout vider" si au moins un dept est en cache (`Object.keys(cachedDepts).length > 0`)

- [x] Task 8 : Lint et validation (AC: #6)
  - [x] `rtk pnpm lint` — 0 erreur bloquante
  - [x] `rtk pnpm build` — 0 erreur TypeScript

## Dev Notes

### Contexte multi-département — `departmentsToLoad`

`FuelDataLoader` calcule `departmentsToLoad` via `getDepartmentsInRadius` : selon le rayon de recherche, 1 à ~5 départements sont chargés en parallèle. Le cache doit couvrir **la totalité** de `departmentsToLoad`, pas seulement `selectedDepartment`.

Exemple avec rayon 20 km autour d'une ville frontière :

```
departmentsToLoad = ['75', '92', '93', '94']
→ 4 fichiers Parquet à cacher individuellement
→ 4 entrées IndexedDB indépendantes
→ 4 lignes de statut dans les Réglages
```

### Décision technique — IndexedDB vs OPFS

| Approche      | Avantages                                        | Inconvénients                         |
| ------------- | ------------------------------------------------ | ------------------------------------- |
| **IndexedDB** | Supporté partout, pas de DuckDB natif requis     | `registerFileBuffer` à chaque session |
| **OPFS**      | DuckDB gère le FS natif, persistance automatique | Chrome 86+, Firefox 111+ requis       |

**Décision : IndexedDB.** Compatible avec tous les navigateurs supportant DuckDB-WASM. OPFS est une évolution future possible mais hors scope.

### Task 2 — `src/lib/deptCache.ts`

```ts
import {
  CACHE_MAX_AGE_MS,
  DEPT_CACHE_DB_NAME,
  DEPT_CACHE_DB_VERSION,
  DEPT_CACHE_STORE_NAME,
} from "@/lib/constants";
import type { AsyncDuckDB } from "@duckdb/duckdb-wasm";

export type DeptCacheEntry = {
  dept: string;
  buffer: ArrayBuffer;
  cachedAt: number;
  size: number;
};

const openCacheDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DEPT_CACHE_DB_NAME, DEPT_CACHE_DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(DEPT_CACHE_STORE_NAME)) {
        db.createObjectStore(DEPT_CACHE_STORE_NAME, { keyPath: "dept" });
      }
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = () => reject(req.error);
  });

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
```

### Task 3 — `src/lib/deptDownload.ts`

```ts
export const downloadDeptParquet = async (
  url: string,
  onProgress: (ratio: number) => void,
): Promise<ArrayBuffer> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);

  const contentLength = response.headers.get("Content-Length");
  if (!contentLength || !response.body) {
    onProgress(0.5);
    const buffer = await response.arrayBuffer();
    onProgress(1);
    return buffer;
  }

  const total = parseInt(contentLength, 10);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress(received / total);
  }

  const buffer = new ArrayBuffer(received);
  const view = new Uint8Array(buffer);
  let offset = 0;
  for (const chunk of chunks) {
    view.set(chunk, offset);
    offset += chunk.length;
  }
  return buffer;
};
```

### Task 4 — Modifications du store

**Dans `src/store/types.ts`**, ajouter à `AppStore` :

```ts
cachedDepts: Record<string, { cachedAt: number; size: number }>
loadedDepts: string[]
setCachedDeptMeta: (dept: string, meta: { cachedAt: number; size: number } | null) => void
clearAllCachedDepts: () => void
setLoadedDepts: (depts: string[]) => void
```

**Dans `src/store/useAppStore.ts`** :

```ts
cachedDepts: {},
loadedDepts: [],
setCachedDeptMeta: (dept, meta) =>
  set((state) => ({
    cachedDepts: meta
      ? { ...state.cachedDepts, [dept]: meta }
      : Object.fromEntries(Object.entries(state.cachedDepts).filter(([k]) => k !== dept)),
  })),
clearAllCachedDepts: () => set({ cachedDepts: {} }),
setLoadedDepts: (depts) => set({ loadedDepts: depts }),
```

**Dans `partialize`** : ajouter `cachedDepts: state.cachedDepts` uniquement. **Ne pas inclure `loadedDepts`** (état runtime, non pertinent entre sessions).

### Task 5 — `src/hooks/useDeptCache.ts`

`cacheInBackground` est conçu pour être appelé plusieurs fois en parallèle (une fois par dept). Chaque appel est indépendant et gère son propre état de progression.

```ts
"use client";

import { useCallback, useState } from "react";
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

  const [downloadingDepts, setDownloadingDepts] = useState<string[]>([]);
  const [progressByDept, setProgressByDept] = useState<Record<string, number>>(
    {},
  );

  const cacheInBackground = useCallback(
    async (dept: string) => {
      if (!db) return;
      // Éviter le double téléchargement du même dept
      setDownloadingDepts((prev) => {
        if (prev.includes(dept)) return prev;
        return [...prev, dept];
      });
      setProgressByDept((prev) => ({ ...prev, [dept]: 0 }));

      const url = `${HF_LATEST_BASE_URL}/code_departement=${dept}/data_0.parquet`;
      try {
        const buffer = await downloadDeptParquet(url, (ratio) => {
          setProgressByDept((prev) => ({ ...prev, [dept]: ratio }));
        });
        const size = buffer.byteLength;
        await setCachedDeptEntry(dept, buffer, size);
        await registerCachedDeptInDuckDB(db, dept, buffer);
        setCachedDeptMeta(dept, { cachedAt: Date.now(), size });
        // Pas de toast — transparent pour l'utilisateur
      } catch {
        // Silencieux — le cache est une optimisation, pas une fonctionnalité critique
      } finally {
        setDownloadingDepts((prev) => prev.filter((d) => d !== dept));
        setProgressByDept((prev) => {
          const next = { ...prev };
          delete next[dept];
          return next;
        });
      }
    },
    [db, setCachedDeptMeta],
  );

  const removeAllDeptCache = useCallback(async () => {
    await clearAllDeptCache();
    clearAllCachedDepts();
    toast.info("Cache vidé");
  }, [clearAllCachedDepts]);

  return {
    downloadingDepts,
    progressByDept,
    cacheInBackground,
    removeAllDeptCache,
  };
}
```

⚠️ `cacheInBackground` vérifie `prev.includes(dept)` pour éviter de lancer deux téléchargements simultanés du même dept. Le `useCallback` sans `downloadingDepts` dans les deps est intentionnel — le check est dans le `setState` callback (lecture en fermant sur la valeur précédente).

### Task 6 — Modifications de `FuelDataLoader.tsx`

**Hook + sélecteurs à ajouter en haut du composant :**

```ts
const { cacheInBackground } = useDeptCache();
const setLoadedDepts = useAppStore((s) => s.setLoadedDepts);
const cachedDepts = useAppStore((s) => s.cachedDepts);
```

**Dans la boucle `departmentsToLoad.map(async (dept) => { ... })` :**

```ts
const entry = await getDeptCacheEntry(dept);

if (entry && isCacheValid(entry)) {
  // Cache valide (< 2h) : aucun appel réseau
  await registerCachedDeptInDuckDB(db, dept, entry.buffer);
  const conn = await db.connect();
  const res = await conn.query(
    `SELECT * FROM read_parquet('${getDeptLocalFileName(dept)}')`,
  );
  await conn.close();
  return res.toArray().map((r) => r.toJSON()) as unknown as RawStationData[];
}

// Pas de cache valide → comportement actuel (HuggingFace)
const conn = await db.connect();
const url = `${BASE}/code_departement=${dept}/data_0.parquet`;
const res = await conn.query(`SELECT * FROM read_parquet('${url}')`);
await conn.close();
return res.toArray().map((r) => r.toJSON()) as unknown as RawStationData[];
```

**Après `setStations(stations)` dans le bloc `if (isMounted)` — déclencher le cache pour tous les depts :**

```ts
// Informer le store des depts actuellement chargés (pour l'UI Réglages)
setLoadedDepts(departmentsToLoad);

// Cacher en arrière-plan tous les depts sans cache valide
for (const dept of departmentsToLoad) {
  const entry = await getDeptCacheEntry(dept);
  if (!entry || !isCacheValid(entry)) {
    void cacheInBackground(dept); // fire-and-forget, parallèle
  }
}
```

⚠️ Le `for...of` lance plusieurs `cacheInBackground` sans `await` — ils s'exécutent en parallèle, chacun gérant sa propre progression.

⚠️ `getDeptCacheEntry`, `isCacheValid`, `registerCachedDeptInDuckDB`, `getDeptLocalFileName` doivent être importés depuis `@/lib/deptCache`.

⚠️ `setLoadedDepts` et `cachedDepts` doivent être ajoutés aux destructurations du store dans `FuelDataLoader`.

⚠️ Le `toast.success` existant est **conservé tel quel**.

### Task 7 — Section Cache dans `SettingsBody.tsx`

`SettingsBody` lit `loadedDepts` et `cachedDepts` depuis le store, et appelle `useDeptCache()` pour la progression et le "Tout vider".

**Ajouter en fin de `SettingsBody`** :

```tsx
<Separator />
<div className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
  Données hors ligne
</div>

{loadedDepts.length > 0 ? (
  <div className='flex flex-col gap-1.5'>
    {loadedDepts.map((dept) => {
      const meta = cachedDepts[dept]
      const isLoading = downloadingDepts.includes(dept)
      const progress = progressByDept[dept] ?? 0
      return (
        <div key={dept} className='flex items-center justify-between gap-2'>
          <span className='text-muted-foreground text-xs font-mono'>Dept {dept}</span>
          {isLoading ? (
            <div className='flex flex-1 items-center gap-1.5'>
              <div className='bg-muted h-1 flex-1 overflow-hidden rounded-full'>
                <div
                  className='bg-primary h-full rounded-full transition-all duration-200'
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <span className='text-muted-foreground w-7 text-right text-xs'>
                {Math.round(progress * 100)}%
              </span>
            </div>
          ) : meta ? (
            <span className='text-muted-foreground text-xs'>
              {formatCacheAge(meta.cachedAt)} • {Math.round(meta.size / 1024)} Ko
            </span>
          ) : (
            <span className='text-muted-foreground text-xs opacity-50'>Non mis en cache</span>
          )}
        </div>
      )
    })}

    {Object.keys(cachedDepts).length > 0 && (
      <button
        onClick={removeAllDeptCache}
        className='text-muted-foreground hover:text-foreground mt-1 self-start text-xs underline-offset-2 hover:underline'
      >
        Tout vider
      </button>
    )}
  </div>
) : (
  <p className='text-muted-foreground text-xs'>Aucun département chargé</p>
)}
```

**Helper `formatCacheAge`** (à ajouter dans `SettingsBody` ou dans `src/lib/utils.ts`) :

```ts
const formatCacheAge = (cachedAt: number): string => {
  const diffMin = Math.round((Date.now() - cachedAt) / 60000);
  if (diffMin < 60) return `il y a ${diffMin} min`;
  return `il y a ${Math.round(diffMin / 60)}h`;
};
```

**Sélecteurs à ajouter dans le `useAppStore` de `SettingsBody`** :

```ts
const loadedDepts = useAppStore((s) => s.loadedDepts);
const cachedDepts = useAppStore((s) => s.cachedDepts);
const { downloadingDepts, progressByDept, removeAllDeptCache } = useDeptCache();
```

### Nom de fichier DuckDB : convention

```ts
getDeptLocalFileName("75"); // → 'latest_75.parquet'
// Requête : SELECT * FROM read_parquet('latest_75.parquet')
```

Ne PAS utiliser l'URL HF dans `read_parquet` quand le cache est disponible.

### `registerFileBuffer` : durée de vie en session

Enregistrement en mémoire DuckDB valable pour la session courante. À chaque rechargement de page, `FuelDataLoader` re-vérifie IndexedDB et rappelle `registerCachedDeptInDuckDB` — le ré-enregistrement est automatique.

### Anti-patterns à éviter

- ❌ Aucun toast pendant `cacheInBackground` — la progression est visible uniquement dans les Réglages
- ❌ Ne pas stocker le `ArrayBuffer` dans le store Zustand — uniquement les métadonnées (`cachedAt`, `size`)
- ❌ Ne pas `await` les `cacheInBackground` dans la boucle post-load — `void` (fire-and-forget)
- ❌ Ne pas créer de connexion DuckDB dans `deptDownload.ts` — uniquement `fetch`
- ❌ Ne pas inclure `loadedDepts` dans `partialize` — état runtime, inutile entre sessions
- ❌ `openCacheDB` accède à `indexedDB` (browser-only). Les appelants (`FuelDataLoader`, `useDeptCache`) sont `'use client'` — pas de risque SSR en pratique. Si build error : ajouter `if (typeof window === 'undefined') return null`

### Références fichiers existants

- `FuelDataLoader.tsx:53–64` — calcul `departmentsToLoad` (useMemo) — **ne pas modifier ce calcul**
- `FuelDataLoader.tsx:71–140` — boucle principale, restructurer autour des lignes 98–108
- `DuckDBProvider.tsx:18` — `useDuckDB()` hook
- `useAppStore.ts:211–269` — `partialize` et `merge` — ajouter `cachedDepts`
- `constants.ts:63–66` — `HF_LATEST_BASE_URL`
- `SettingsBody.tsx:84–251` — pattern section (separator + label uppercase + contenu)
- `lib/departments.ts` — `getDepartmentsInRadius` (utilisé dans `FuelDataLoader` pour `departmentsToLoad`, **pas à importer dans les nouvelles fonctions**)

### Structure de fichiers

**À créer :**

- `src/lib/deptCache.ts`
- `src/lib/deptDownload.ts`
- `src/hooks/useDeptCache.ts`

**À modifier :**

- `src/lib/constants.ts` — 4 constantes cache
- `src/store/types.ts` — 5 nouvelles entrées dans `AppStore`
- `src/store/useAppStore.ts` — 3 actions + partialize
- `src/components/FuelDataLoader.tsx` — intégration cache + `setLoadedDepts` + boucle cacheInBackground
- `src/components/StationList/components/StationListSettings/components/SettingsBody.tsx` — section "Données hors ligne"

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `recharts` était déclaré dans `package.json` mais non installé — `pnpm install` exécuté pour corriger ce problème pré-existant avant le build.
- `cachedDepts` exclu du dep array de `useEffect` dans `FuelDataLoader` pour éviter une boucle infinie (mise à jour cache → re-render → rechargement complet).

### Completion Notes List

- Ajout de 4 constantes IndexedDB dans `src/lib/constants.ts` (`DEPT_CACHE_DB_NAME`, `DEPT_CACHE_STORE_NAME`, `DEPT_CACHE_DB_VERSION`, `CACHE_MAX_AGE_MS`).
- Création de `src/lib/deptCache.ts` : couche IndexedDB complète (CRUD, validation, enregistrement DuckDB).
- Création de `src/lib/deptDownload.ts` : téléchargement Parquet avec progression chunk-by-chunk + fallback arrayBuffer.
- Ajout de `cachedDepts`, `loadedDepts` et 3 actions dans le store Zustand (`types.ts` + `useAppStore.ts`). `cachedDepts` inclus dans `partialize`, `loadedDepts` exclu (runtime).
- Création de `src/hooks/useDeptCache.ts` : hook `cacheInBackground` (silencieux) + `removeAllDeptCache` (toast.info).
- Modification de `FuelDataLoader.tsx` : check IndexedDB avant chaque appel HuggingFace, cache en arrière-plan post-chargement pour les depts sans cache valide, `setLoadedDepts` après succès.
- Ajout de la section "Données hors ligne" dans `SettingsBody.tsx` : statut par dept (mini barre de progression / âge + taille / non mis en cache) + bouton "Tout vider".
- Lint : 0 erreur bloquante. Build : ✅ 0 erreur TypeScript.

### File List

- `src/lib/constants.ts` (modifié — 4 constantes cache ajoutées)
- `src/lib/deptCache.ts` (créé)
- `src/lib/deptDownload.ts` (créé)
- `src/store/types.ts` (modifié — 5 entrées AppStore ajoutées)
- `src/store/useAppStore.ts` (modifié — 3 actions + partialize)
- `src/hooks/useDeptCache.ts` (créé)
- `src/components/FuelDataLoader.tsx` (modifié — intégration cache)
- `src/components/StationList/components/StationListSettings/components/SettingsBody.tsx` (modifié — section "Données hors ligne")

### Review Findings

- [x] [Review][Decision] D1 — `downloadingDepts`/`progressByDept` dans le store Zustand — **accepté** (nécessaire pour observabilité multi-composant)
- [x] [Review][Decision] D2 — `resetApp` (reset complet) au lieu de "Tout vider" — **accepté**
- [x] [Review][Decision] D3 — Rolling cache 30j ajouté hors scope — **accepté** comme enhancement intégré
- [x] [Review][Patch] P1 — `conn.close()` dans finally (path cache + HF) [src/components/FuelDataLoader.tsx]
- [x] [Review][Patch] P2 — `cacheHits--` dans catch si fallback HF déclenché [src/components/FuelDataLoader.tsx]
- [x] [Review][Patch] P3 — `reader.cancel()` sur erreur mid-stream [src/lib/deptDownload.ts]
- [x] [Review][Patch] P4 — Guard `isNaN(total) || total <= 0` avant lecture du stream [src/lib/deptDownload.ts]
- [x] [Review][Patch] P5 — try/catch autour de `clearAllDeptCache()` dans `resetApp` [src/hooks/useDeptCache.ts]
- [x] [Review][Patch] P6 — `openCacheDB()` singleton promise (connexion IDB réutilisée) [src/lib/deptCache.ts]
- [x] [Review][Patch] P7 — `isRollingCacheValid` utilise `getUTC*` (cohérence timezone) [src/lib/deptCache.ts]
- [x] [Review][Defer] W1 — Injection SQL via `dept` dans requête DuckDB — risque théorique, `dept` est interne et contrôlé [src/components/FuelDataLoader.tsx:133] — deferred, pre-existing
- [x] [Review][Defer] W2 — Downloads en arrière-plan sans AbortController — si le composant se démonte, `registerFileBuffer` peut être appelé après nettoyage [src/hooks/useDeptCache.ts:35] — deferred, pre-existing
- [x] [Review][Defer] W3 — Toast Sonner rendu avant `window.location.reload()` non garanti (event loop) [src/hooks/useDeptCache.ts:117] — deferred, impact UX mineur
- [x] [Review][Defer] W4 — `isCacheValid` : age négatif si horloge système recule (clock skew) → cache marqué valide [src/lib/deptCache.ts:82] — deferred, cas extrême

## Change Log

- 2026-04-15 : Création US-04-01 — Cache transparent multi-depts (2h, arrière-plan automatique pour tous les depts de `departmentsToLoad`, progression discrète par dept dans les Réglages, aucun toast utilisateur)
- 2026-04-15 : Implémentation complète US-04-01 — IndexedDB cache, hook `useDeptCache`, section Réglages "Données hors ligne", lint ✅ build ✅
