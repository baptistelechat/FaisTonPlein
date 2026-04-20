# Code Review — US-04-01 : Cache Départemental

**Date :** 2026-04-20
**Reviewer :** claude-sonnet-4-6 (bmad-code-review)
**Story :** [US-04-01-Cache-Departemental.md](../../stories/epic-4-resilience-offline/US-04-01-Cache-Departemental.md)
**Branch :** epic-4
**Statut final :** ✅ done

---

## Résumé de la review

3 layers adversariaux lancés en parallèle : Blind Hunter, Edge Case Hunter, Acceptance Auditor.

| Catégorie       | Nombre             |
| --------------- | ------------------ |
| Decision needed | 3                  |
| Patch           | 7 → tous appliqués |
| Defer           | 4                  |
| Dismiss         | 8                  |

---

## Acceptance Criteria — Conformité

| AC  | Titre                                                                                | Statut                                       |
| --- | ------------------------------------------------------------------------------------ | -------------------------------------------- |
| #1  | Tous les depts de `departmentsToLoad` cachés en arrière-plan après chargement réseau | ✅ Conforme                                  |
| #2  | Cache valide (< 2h) → IndexedDB, aucun appel réseau HuggingFace                      | ⚡ Voir P2 (cacheHits inaccurate)            |
| #3  | Cache périmé → rechargé HuggingFace, rafraîchi en arrière-plan                       | ✅ Conforme                                  |
| #4  | Réglages : statut individuel par dept (âge + taille / barre progression)             | ⚡ Déviation D3 (ajout sous-section rolling) |
| #5  | Bouton "Tout vider" → supprime IndexedDB + réinitialise store                        | ⚡ Déviation D2 (resetApp, scope élargi)     |
| #6  | Lint : 0 erreur bloquante                                                            | ✅ Conforme                                  |

---

## Décisions en attente

### [D1] `downloadingDepts`/`progressByDept` dans le store Zustand

La spec imposait ces deux champs comme state local du hook `useDeptCache`. L'implémentation les place dans le store Zustand avec `setDownloadingDept(dept, progress|null)`.

**Argument pour accepter :** `SettingsBody.tsx` doit lire la progression pour afficher la barre par dept — sans Zustand, il faudrait du prop-drilling ou un context dédié. Le store est déjà le lieu de toute la state partagée dans cette app.

**Argument contre :** Violation explicite des Dev Notes de la spec. `downloadingDepts`/`progressByDept` sont du state purement runtime qui n'a aucune raison d'être en dehors du hook.

---

### [D2] `resetApp` (reset complet) vs bouton "Tout vider"

AC#5 spécifie un bouton "Tout vider" qui supprime les entrées IndexedDB et réinitialise le store. L'implémentation a un bouton "Réinitialiser l'application" dans un `AlertDialog` qui fait : `clearAllDeptCache()` + `clearAllCachedDepts()` + `localStorage.removeItem("faistonplein-preferences")` + `window.location.reload()`.

**Argument pour accepter :** Confirmation via AlertDialog appropriée pour une action destructive. Reset complet cohérent (l'utilisateur repart d'une ardoise vierge). UX plus claire.

**Argument contre :** L'utilisateur perd ses préférences (rayon, carburant, etc.) sans que la spec le prévoit. "Tout vider" devrait idéalement être indépendant de "Réinitialiser les préférences".

---

### [D3] Rolling cache 30j ajouté hors scope

La story ne mentionne pas de cache rolling. L'implémentation ajoute : `cachedRollingDepts`, `setCachedRollingDeptMeta`, `cacheRollingInBackground`, `isRollingCacheValid` (TTL journalier), affichage "Historique 30j" dans Réglages.

**Argument pour accepter :** Le rolling cache existait déjà côté ETL. Cacher le Parquet rolling localement évite un re-fetch journalier pour les graphiques de prix. La feature de D3 est utilisée dans `usePriceHistory` via `getRollingParquetSource`.

**Argument contre :** Scope expansion non validé. Introduit de la complexité dans le store, le hook et l'UI.

---

## Patches

### [P1] `conn.close()` absent si `conn.query()` rejette

**Fichier :** `src/components/FuelDataLoader.tsx` ~ligne 130

```typescript
// Avant (path cache hit)
await registerCachedDeptInDuckDB(db, dept, entry.buffer);
const conn = await db.connect();
const res = await conn.query(
  `SELECT * FROM read_parquet('${getDeptLocalFileName(dept)}')`,
);
await conn.close(); // jamais atteint si query() rejette
return res.toArray().map((r) => r.toJSON()) as unknown as RawStationData[];

// Après
await registerCachedDeptInDuckDB(db, dept, entry.buffer);
const conn = await db.connect();
try {
  const res = await conn.query(
    `SELECT * FROM read_parquet('${getDeptLocalFileName(dept)}')`,
  );
  return res.toArray().map((r) => r.toJSON()) as unknown as RawStationData[];
} finally {
  await conn.close();
}
```

Même correctif à appliquer dans le path HuggingFace (même structure, même bug).

---

### [P2] `cacheHits` non décrémenté si `registerCachedDeptInDuckDB` échoue

**Fichier :** `src/components/FuelDataLoader.tsx` ~ligne 120

Si `registerCachedDeptInDuckDB` ou `conn.query()` échoue dans le bloc cache, le `catch` silencieux déclenche le fallback HuggingFace — mais `cacheHits` a déjà été incrémenté. Le toast peut afficher "cache local" alors que les données viennent du réseau.

```typescript
// Avant
if (entry && isCacheValid(entry)) {
  cacheHits++;
  try {
    // ...
    return data; // depuis le cache
  } catch {
    // fallback HF silencieux, mais cacheHits reste incrémenté ❌
  }
}

// Après
if (entry && isCacheValid(entry)) {
  try {
    // ...
    cacheHits++; // Incrémenter APRÈS succès
    return data;
  } catch {
    // fallback HF, cacheHits non modifié ✅
  }
}
```

---

### [P3] `ReadableStream` reader non annulé sur erreur mid-stream

**Fichier :** `src/lib/deptDownload.ts` ~ligne 20

```typescript
// Avant
const reader = response.body.getReader();
const chunks: Uint8Array[] = [];
let received = 0;
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  // ...
}

// Après
const reader = response.body.getReader();
const chunks: Uint8Array[] = [];
let received = 0;
try {
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress(Math.min(received / total, 1));
  }
} catch (err) {
  reader.cancel();
  throw err;
}
```

---

### [P4] `parseInt` non validé — NaN silencieux + total=0

**Fichier :** `src/lib/deptDownload.ts` ~ligne 16

```typescript
// Avant
const total = parseInt(contentLength, 10);
const reader = response.body.getReader();

// Après
const total = parseInt(contentLength, 10);
if (isNaN(total) || total <= 0) {
  // Fallback sans progression
  onProgress(0.5);
  const buffer = await response.arrayBuffer();
  onProgress(1);
  return buffer;
}
const reader = response.body.getReader();
```

---

### [P5] `clearAllDeptCache()` sans try/catch dans `resetApp`

**Fichier :** `src/hooks/useDeptCache.ts` ~ligne 114

Si `clearAllDeptCache()` (IDB) échoue, `clearAllCachedDepts()` (store) est quand même exécuté. Store dit "pas de cache" mais IDB contient encore les données.

```typescript
// Avant
const resetApp = useCallback(async () => {
  await clearAllDeptCache();
  clearAllCachedDepts();
  localStorage.removeItem("faistonplein-preferences");
  toast.info("Réinitialisation…");
  window.location.reload();
}, [clearAllCachedDepts]);

// Après
const resetApp = useCallback(async () => {
  try {
    await clearAllDeptCache();
  } catch {
    // IDB peut échouer (quota, mode privé) — continuer quand même
  }
  clearAllCachedDepts();
  localStorage.removeItem("faistonplein-preferences");
  toast.info("Réinitialisation…");
  window.location.reload();
}, [clearAllCachedDepts]);
```

---

### [P6] `openCacheDB()` crée une nouvelle connexion IDB à chaque appel

**Fichier :** `src/lib/deptCache.ts` ~ligne 18

```typescript
// Avant — connexion recréée à chaque opération
const openCacheDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => { ... });

// Après — singleton promise (connexion partagée)
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
        dbPromise = null; // Reset pour permettre retry
        reject(req.error);
      };
    });
  }
  return dbPromise;
};
```

---

### [P7] `isRollingCacheValid` utilise l'heure locale — bug à minuit en UTC offset

**Fichier :** `src/lib/deptCache.ts` ~ligne 118

```typescript
// Avant — heure locale (bug à minuit selon timezone)
export const isRollingCacheValid = (entry: DeptCacheEntry): boolean => {
  const cachedDate = new Date(entry.cachedAt);
  const now = new Date();
  return (
    cachedDate.getFullYear() === now.getFullYear() &&
    cachedDate.getMonth() === now.getMonth() &&
    cachedDate.getDate() === now.getDate()
  );
};

// Après — UTC (cohérent avec les timestamps du serveur)
export const isRollingCacheValid = (entry: DeptCacheEntry): boolean => {
  const cachedDate = new Date(entry.cachedAt);
  const now = new Date();
  return (
    cachedDate.getUTCFullYear() === now.getUTCFullYear() &&
    cachedDate.getUTCMonth() === now.getUTCMonth() &&
    cachedDate.getUTCDate() === now.getUTCDate()
  );
};
```

---

## Travaux déférés

- **W1** — Injection SQL via `dept` dans requête DuckDB — `dept` est interne et contrôlé (liste blanche via `getDepartmentsInRadius`), même pattern dans le code pré-existant. Risque pratique nul en sandbox WASM.
- **W2** — Downloads en arrière-plan sans `AbortController` — si le composant se démonte en cours de téléchargement, `registerFileBuffer` peut être appelé après nettoyage du contexte DuckDB. Architecture concern, hors scope.
- **W3** — Toast Sonner potentiellement non rendu avant `window.location.reload()` — impact UX mineur (l'utilisateur voit le reload, pas le toast). Acceptable.
- **W4** — `isCacheValid` : age négatif si horloge système recule — résultat négatif < `CACHE_MAX_AGE_MS` → cache marqué valide (comportement sûr). Cas extrême, faible impact.

---

## Dismissed (8)

- `useEffect` sans deps array pour la mise à jour des refs — pattern intentionnel ("always fresh ref"), correctement utilisé.
- Race condition sur `cacheHits++` — JavaScript est mono-thread ; l'incrément est synchrone, pas de vraie race.
- Double lecture IDB pour le même dept (check + post-load) — optimisation, non bloquant.
- `CACHE_MAX_AGE_MS` non utilisé dans `isRollingCacheValid` — deux TTL intentionnellement distincts (2h latest, journalier rolling).
- Mutex manquant sur `downloadingDepts` — `set()` Zustand est synchrone ; `getState()` lit l'état courant sans race réelle en JS.
- Thrashing re-render sur `setDownloadingDept` — acceptable pour 1–5 depts en pratique.
- Échec metadata fetch (non lié à cette story) — pré-existant.
- `DEVIATION-07` (usage de `getState()`) — conséquence directe de D1, pas un finding indépendant.
