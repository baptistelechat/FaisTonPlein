# Code Review — US-03-01 : Indicateur de Tendance

**Date :** 2026-04-07
**Branche :** `epic-3`
**Baseline :** `4d1536f` (fin Epic 2)
**Fichiers reviewés :** 9 fichiers, +286 / -18 lignes
**Couches :** Blind Hunter · Edge Case Hunter · Acceptance Auditor
**Mode :** full (spec fournie)

---

## Résumé

| Catégorie | Nombre |
|---|---|
| `decision_needed` | 2 |
| `patch` | 5 |
| `defer` | 2 |
| `dismissed` | 4 |

---

## Findings

### [Decision 1] TrendIndicator stable : divergence icon/couleur/taille vs spec

**Sources :** Blind Hunter + Acceptance Auditor
**Fichier :** `src/components/TrendIndicator.tsx:32-40`

L'implémentation utilise :
- Icône `Scale` pour `stable` → spec prescrit `Minus`
- Couleur `text-amber-500` pour `stable` → spec prescrit `text-muted-foreground`
- Taille `size-3.5` → spec prescrit `size-3`

Le spinner `isLoading` utilise aussi `size-3.5`, suggérant une cohérence intentionnelle. La couleur amber donne plus de visibilité au signal "stable" vs la couleur grisée discrète de la spec. **Décision requise : choisir entre le comportement actuel (plus visible) ou revenir à la spec.**

---

### [Decision 2] `usePriceTrends` monté dans les deux layouts

**Sources :** Blind Hunter + Edge Case Hunter
**Fichiers :** `src/components/DesktopLayout.tsx:11`, `src/components/MobileLayout.tsx:15`

Le hook est appelé dans `DesktopLayout` ET `MobileLayout`. Si les deux layouts ne sont **jamais** rendus simultanément (rendu conditionnel JS via `useIsDesktop`), ce n'est pas un problème. Si une des deux est visible via CSS uniquement (les deux montées dans le DOM), cela provoque un double fetch et une race condition sur `arePriceTrendsLoading`. **Décision requise : confirmer que le rendu est mutuellement exclusif.**

---

### [Patch 1] `arePriceTrendsLoading` peut rester `true` indéfiniment

**Sources :** Blind Hunter + Edge Case Hunter
**Fichier :** `src/hooks/usePriceTrends.ts:18,30`
**Sévérité :** HIGH

`setArePriceTrendsLoading(true)` est appelé avant le check `isMounted`. Si le composant est démonté avant résolution de la Promise, le `.then`/`.catch` ne s'exécute pas (car `if (isMounted) ...`), et `setArePriceTrendsLoading(false)` n'est jamais appelé. Le spinner reste visible indéfiniment.

**Fix :** Appeler `setArePriceTrendsLoading(false)` dans la fonction de cleanup du `useEffect`.

```ts
return () => {
  isMounted = false
  setArePriceTrendsLoading(false) // ← ajouter
}
```

---

### [Patch 2] `priceTrends` périmées pendant rechargement de département

**Source :** Edge Case Hunter
**Fichier :** `src/hooks/usePriceTrends.ts:15` + `src/store/useAppStore.ts:282`
**Sévérité :** HIGH

Quand les stations changent (nouveau département), l'ancien `priceTrends` reste dans le store pendant toute la durée du fetch. Si des IDs de stations se chevauchent entre départements, de fausses tendances du département précédent s'affichent.

**Fix :** Vider `priceTrends` avant de lancer le nouveau fetch.

```ts
useEffect(() => {
  if (!db || stations.length === 0) return
  let isMounted = true
  setPriceTrends({}) // ← vider l'ancien résultat
  setArePriceTrendsLoading(true)
  // ...
}, [db, selectedDepartment, stations.length])
```

---

### [Patch 3] `useEffect` déclenché sur `stations.length` au lieu de `selectedDepartment`

**Sources :** Blind Hunter + Acceptance Auditor
**Fichier :** `src/hooks/usePriceTrends.ts:36`
**Sévérité :** MEDIUM · Violation AC #5

La spec (AC #5 + Dev Notes) indique que le hook doit se déclencher sur `selectedDepartment`. L'implémentation utilise `stations.length`, ce qui :
1. Ne se déclenche pas si `selectedDepartment` change mais que le nombre de stations reste identique
2. Peut se déclencher sur d'autres changements de `stations.length` non liés à un changement de département

**Fix :**

```ts
const selectedDepartment = useAppStore((s) => s.selectedDepartment)
// ...
useEffect(() => {
  if (!db || !selectedDepartment || stations.length === 0) return
  // ...
}, [db, selectedDepartment, stations.length])
```

---

### [Patch 4] `getDeptFromStationId` retourne `"20"` pour la Corse

**Sources :** Blind Hunter + Edge Case Hunter
**Fichier :** `src/lib/priceTrends.ts:15-19`
**Sévérité :** MEDIUM

Les IDs de stations corses sont numériques (ex: `2000001`). `s.slice(0, 2)` retourne `"20"` qui n'existe pas comme département dans les fichiers Parquet (partitionnés en `2A`/`2B`). Les stations corses n'auront silencieusement aucune tendance.

**Fix :** Ajouter un mapping pour les IDs Corse (se référer à la liste des départements dans `src/lib/departments.ts`). Une approche simple : mapper les IDs `20xxxxx` vers leur code correct via les données déjà disponibles dans le store ou `departments.ts`.

---

### [Patch 5] `FUEL_COLUMN_MAP` déclaré mais jamais utilisé

**Sources :** Edge Case Hunter + Acceptance Auditor
**Fichier :** `src/lib/priceTrends.ts:37-44`
**Sévérité :** LOW

La constante `FUEL_COLUMN_MAP` est définie mais la query SQL hard-code les noms de colonnes directement. Code mort + point de divergence silencieux si un carburant est ajouté.

**Fix :** Soit supprimer `FUEL_COLUMN_MAP`, soit l'utiliser pour générer les colonnes de la query.

---

### [Defer 1] `filterAvailableUrls` : N×7 requêtes HEAD sans rate limiting

**Sources :** Blind Hunter + Edge Case Hunter
**Fichier :** `src/lib/priceTrends.ts:136-145`
**Raison du différé :** Optimisation future — pas un bug bloquant pour la story

Pour chaque département unique parmi les stations chargées, 7 requêtes HEAD sont faites en parallèle. Avec plusieurs départements (ex: Île-de-France → 8 depts × 7 jours = 56 requêtes HEAD simultanées), cela peut saturer la connexion ou déclencher un rate-limit HuggingFace. Aucun timeout ni abort signal.

---

### [Defer 2] Injection SQL théorique via URLs dans query DuckDB

**Sources :** Blind Hunter + Edge Case Hunter
**Fichier :** `src/lib/priceTrends.ts:65`
**Raison du différé :** Risque théorique — IDs proviennent de data.gouv (format numérique)

Les URLs sont concaténées dans la chaîne SQL sans échappement. Si un `stationId` contenait un `'`, cela créerait une injection. En pratique, les IDs sont des entiers issus des fichiers Parquet de data.gouv, donc le risque est nul dans le contexte actuel.

---

## Dismissed (4)

- **Connexion DuckDB non fermée** (Blind Hunter) — Faux positif : le `try/finally` ferme correctement la connexion quelle que soit l'issue.
- **`selectedFuel` absent de `fetchPriceTrends`** (Acceptance Auditor) — Amélioration intentionnelle : calculer toutes les tendances en une requête est plus efficace que la signature de spec. Pas un bug.
- **`selectedFuel` casté sans validation dans StationCard** (Edge Case Hunter) — TypeScript garantit la cohérence à la compilation. Pas un bug runtime.
- **`setPriceTrends` remplace l'objet entier** (Blind Hunter) — Comportement correct pour le modèle mono-département actuel. Le remplacement complet est intentionnel.
