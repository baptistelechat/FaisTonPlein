# Code Review — US-03-03 : Graphique Historique

**Date :** 2026-04-11
**Reviewer :** claude-sonnet-4-6 (bmad-code-review)
**Story :** [US-03-03-Graphique-Historique.md](../../stories/epic-3-intelligence-analyse/US-03-03-Graphique-Historique.md)
**Branch :** epic-3
**Statut final :** ✅ done

---

## Résumé de la review

3 layers adversariaux lancés en parallèle : Blind Hunter, Edge Case Hunter, Acceptance Auditor.

| Catégorie       | Nombre             |
| --------------- | ------------------ |
| Decision needed | 1 → résolu         |
| Patch           | 7 → tous appliqués |
| Defer           | 3                  |
| Dismiss         | 5                  |

---

## Acceptance Criteria — Conformité

| AC  | Titre                                                                               | Statut                                                                       |
| --- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| #1  | Bouton "Historique" (variant outline, icône `History`) dans zone EXPANDED + desktop | ⚡ Déviation acceptée (D1)                                                   |
| #2  | Au premier clic, fetch déclenché + skeleton pendant chargement                      | ⚡ Déviation acceptée (D1)                                                   |
| #3  | Graphique `LineChart` Recharts affiché sous le bouton                               | ⚡ Déviation acceptée (D1)                                                   |
| #4  | Tooltip avec prix €/L et date DD/MM/YYYY au survol                                  | ✅ Conforme                                                                  |
| #5  | Aucune donnée → message court, graphique masqué                                     | ✅ Conforme                                                                  |
| #6  | Cache mémoire session par clé `${stationId}_${fuelType}`                            | ✅ Conforme (clé enrichie de la date pour invalidation journalière)          |
| #7  | `selectedStation` change → graphique masqué, cache conservé                         | ⚡ Déviation acceptée (D1)                                                   |
| #8  | `getDeptFromStationId` exporté depuis `priceTrends.ts`                              | ✅ Conforme (`filterAvailableUrls` non nécessaire, approche rolling Parquet) |
| #9  | Lint : 0 erreur bloquante                                                           | ✅ Conforme                                                                  |

---

## Décision prise

**[D1] Modèle d'interaction et approche données complètement différents de la spec** → **Accepté**

La spec imposait un bouton toggle "Historique" + fetch on-demand (uniquement au clic) + `isVisible`/`toggleVisibility` dans le hook, ainsi qu'une approche données basée sur 30 fichiers Parquet journaliers + `filterAvailableUrls`. L'implémentation a opté pour :

- **Auto-load** : le graphique se charge automatiquement à l'ouverture d'une fiche station via `useEffect`
- **Toujours visible** : `PriceHistoryChart` est rendu sans toggle, directement sous les boutons Maps/Waze
- **1 Parquet rolling** : `ROLLING_BASE_URL/code_departement={dept}/data_0.parquet` au lieu de 30 fichiers journaliers
- **AreaChart shadcn** avec sélecteur de période (7/14/30 jours), visualisation des ruptures, delta €/L (%) et référence moyenne
- **Cache module-level** (`Map` global) avec clé `${id}_${fuel}_${today}` pour invalidation journalière propre

Décision : accepté. L'auto-load simplifie l'UX (moins de friction, graphique toujours disponible) et l'approche rolling Parquet est plus performante (1 requête vs 30 HEAD + batch). Le graphique enrichi apporte une réelle valeur analytique.

---

## Patches appliqués

**[P1] Early-return guard retournait `isLoading: false` malgré l'état interne `true`**

Fichier : `src/hooks/usePriceHistory.ts`

Avant :

```typescript
if (!db || !selectedStation) {
  return { data: [], isLoading: false };
}
return { data, isLoading };
```

Après :

```typescript
return { data, isLoading };
```

Le bloc conditionnel masquait l'état réel du hook, causant un flash d'état vide (skeleton → "Aucune donnée" → données).

---

**[P2] `prices` vide (tous `null`) → `Math.min/max([])` = ±Infinity, `avgPrice` = NaN**

Fichier : `src/components/StationDetail/components/PriceHistoryChart.tsx`

Guard ajouté après le filtre des prix :

```typescript
  if (prices.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-sm">
        Aucune donnée de prix disponible
      </p>
    );
  }
```

Cas : station en rupture complète sur la période filtrée (tous les points `price === null`).

---

**[P3] `deltaPct` : division par zéro si `prices[0] === 0`**

Fichier : `src/components/StationDetail/components/PriceHistoryChart.tsx`

Avant :

```typescript
const deltaPct =
  prices.length >= 2
    ? ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100
    : null;
```

Après :

```typescript
const deltaPct =
  prices.length >= 2 && prices[0] !== 0
    ? ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100
    : null;
```

---

**[P4] Tooltip : `price` undefined → `Number(undefined).toFixed(3)` = "NaN €/L"**

Fichier : `src/components/StationDetail/components/PriceHistoryChart.tsx`

Guard ajouté dans le tooltip custom :

```typescript
const priceEntry = payload.find((p) => p.dataKey === "price");
const price = priceEntry?.value;
if (!isOutage && price === undefined) return null;
```

Cas : Recharts active la série `outagePrice` uniquement sur un point → payload "price" absent.

---

**[P5] `augmentWithOutageBridge` off-by-one : série rouge déborde 1 jour après la fin de rupture**

Fichier : `src/components/StationDetail/components/PriceHistoryChart.tsx`

Supprimé :

```typescript
if (i < data.length) result[i].outagePrice = priceAfter;
```

Le jour réel post-gap (avec `price` non-null) recevait aussi `outagePrice = priceAfter`, faisant visuellement saigner la série rouge d'un jour au-delà de la rupture.

---

**[P6] `onFocus → blur()` cassait la navigation clavier dans le graphique**

Fichier : `src/components/StationDetail/components/PriceHistoryChart.tsx`

Supprimé :

```typescript
  onFocus={(e) => (e.target as HTMLElement).blur()}
```

L'attribut empêchait tout focus clavier sur les éléments du `ChartContainer`. Le ring visuel est déjà supprimé par la classe `[&_*:focus]:[outline:none]`.

---

**[P7] `parseInt(timeRange)` sans radix**

Fichier : `src/components/StationDetail/components/PriceHistoryChart.tsx`

```typescript
// Avant
const days = parseInt(timeRange);
// Après
const days = parseInt(timeRange, 10);
```

---

**[BONUS] Masquer le delta €/L (%) en cas de rupture de carburant**

Fichier : `src/components/StationDetail/components/PriceHistoryChart.tsx` + `index.tsx`

Ajout de la prop `isRupture?: boolean` à `PriceHistoryChart`. Quand `isRupture === true`, le delta d'évolution est masqué (le dernier prix connu n'est plus le prix actuel).

```typescript
// PriceHistoryChart.tsx
{!isRupture && deltaEuros !== null && deltaPct !== null && (
  <span>...</span>
)}

// StationDetail/index.tsx
<PriceHistoryChart
  data={priceHistory}
  isLoading={isPriceHistoryLoading}
  selectedFuel={selectedFuel}
  isRupture={isSelectedFuelRupture}
/>
```

---

**[W1] Sanitization SQL : `stationId` et `dept` interpolés sans garde**

Fichier : `src/lib/priceHistory.ts`

```typescript
const safeId = stationId.replace(/[^0-9]/g, "");
const safeDept = dept.replace(/[^a-zA-Z0-9]/g, "");
```

Risque pratique nul (données internes, sandbox WASM) mais sanitization défensive ajoutée.

---

**[W2] Cache module-level borné à 150 entrées (FIFO)**

Fichier : `src/hooks/usePriceHistory.ts`

```typescript
const HISTORY_CACHE_MAX = 150;
function setCached(key: string, value: PriceHistoryPoint[]): void {
  if (historyCache.size >= HISTORY_CACHE_MAX) {
    const firstKey = historyCache.keys().next().value;
    if (firstKey !== undefined) historyCache.delete(firstKey);
  }
  historyCache.set(key, value);
}
```

---

**[W3] `parseInt` avec radix explicite**

Déjà inclus dans P7.

---

## Travaux déférés

Voir [`_bmad-output/docs/deferred-work.md`](../../deferred-work.md) :

- `stationId`/`dept` interpolés dans SQL DuckDB — sanitization ajoutée (W1), risque résiduel nul en pratique
- Cache `historyCache` — borné (W2), impact résiduel minimal sur longue session
- `parseInt` sans radix — corrigé (W3, inclus dans P7)

---

## Dismissed (5)

- **`AreaChart` vs `LineChart`** — Enhancement intentionnel (gradient, aire sous la courbe), pas une régression.
- **Cache key avec `_today`** — Amélioration (invalidation journalière propre), comportement session correct dans la journée.
- **`fuelType` en SQL** — Enum TypeScript contrôlé par le système de types, WASM sandbox, aucun vecteur d'injection.
- **`db.connect()` avant `try`** — Faux positif : si `db.connect()` throw, aucun `finally` ne s'exécute donc `conn.close()` n'est jamais appelé — comportement correct.
- **Rapid station switching → N connexions DuckDB concurrentes** — Le flag `cancelled` empêche toute corruption d'état. DuckDB-WASM gère les connexions légères sans limite stricte.
