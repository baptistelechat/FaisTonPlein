# Code Review — US-02-03 : Tri Intelligent (Prix + Distance)

**Story :** US-02-03
**Epic :** E02 - Comparaison Économique
**Reviewer :** Developer Agent
**Date :** 2026-03-29
**Verdict global :** ✅ Approuvé

---

## Résumé de l'implémentation

L'implémentation est **complète et va au-delà de la spec** sur plusieurs points. Le helper `calculateEffectiveCost`, le badge conditionnel "Coût/trajet", le tri par coût réel avec secondaire par distance, l'affichage du surcoût trajet, le retour automatique à `distance` lors de la suppression du véhicule, et la validation du sort persisté dans `merge` sont tous opérationnels.

**Post-review :** Suite à la review, deux améliorations ont été ajoutées — renommage "Coût réel" → "Coût/trajet" avec icône `Scale`, et ajout des badges de meilleure station coût/trajet dans la liste, sur la carte (PriceMarker) et dans StationDetail, à la manière des badges "Meilleur prix" et "Plus proche" existants.

---

## Fichiers modifiés

| Fichier | Statut | Notes |
|---|---|---|
| `src/lib/utils.ts` | ✅ Modifié | `calculateEffectiveCost()` + `getBestRealCostStation()` ajoutées |
| `src/store/useAppStore.ts` | ✅ Modifié | Type étendu, `bestRealCostStationIds`, `computeBestStations`, tous setters mis à jour |
| `src/components/StationList/index.tsx` | ✅ Modifié | Badge renommé "Coût/trajet", icône `Scale`, `bestRealCostStationIds` passé |
| `src/components/StationList/components/StationCard.tsx` | ✅ Modifié | Badge `Scale` jaune pour la meilleure station coût/trajet |
| `src/components/PriceMarker.tsx` | ✅ Modifié | Prop `isBestRealCost`, icône `Scale` sur le marker carte |
| `src/components/StationDetail/index.tsx` | ✅ Modifié | Badge "Coût/trajet" dans le détail station |
| `src/components/InteractiveMap.tsx` | ✅ Modifié | `bestRealCostStationIds` extrait du store, passé au `PriceMarker` |

---

## ✅ Points positifs

### 1. `calculateEffectiveCost` — helper propre et testable

```ts
// src/lib/utils.ts
export function calculateEffectiveCost(params: {
  pricePerLiter: number
  distanceKm: number
  fillAmount: number
  consumption: number
}): { fillCost: number; travelCost: number; total: number }
```

Formule exacte de la spec. Le retour d'un objet `{ fillCost, travelCost, total }` permet au consommateur de choisir uniquement la valeur dont il a besoin.

### 2. `getBestRealCostStation` — cohérence avec le pattern existant

```ts
// src/lib/utils.ts
export function getBestRealCostStation({ stations, selectedFuel, referenceLocation, consumption, tankCapacity, fillHabit })
  : { bestRealCostStationIds: string[] }
```

Guard en entrée : retourne `[]` si `referenceLocation === null || consumption <= 0 || tankCapacity <= 0`. API symétrique à `getBestStationsForFuel` — cohérence du code.

### 3. `computeBestStations` — élimination de la duplication dans le store

```ts
// src/store/useAppStore.ts (module level)
function computeBestStations(stations, selectedFuel, showHighwayStations, searchRadius, referenceLocation, consumption, tankCapacity, fillHabit) {
  const filtered = getFilteredStations(...)
  const { bestPriceStationIds, bestDistanceStationIds } = getBestStationsForFuel(...)
  const { bestRealCostStationIds } = getBestRealCostStation(...)
  return { bestPriceStationIds, bestDistanceStationIds, bestRealCostStationIds }
}
```

Les 6 setters qui recalculaient best stations appellent désormais `computeBestStations` en un seul appel. Réduction de duplication significative.

### 4. Granularité correcte pour `setTankCapacity` / `setConsumption` / `setFillHabit`

Ces setters ne recalculent que `bestRealCostStationIds` (pas bestPrice/bestDistance qui n'en dépendent pas) — évite des calculs inutiles sans sacrifier la cohérence.

### 5. `setVehicleType(null)` — reset immédiat à `[]`

```ts
set({
  vehicleType: null,
  tankCapacity: 0,
  consumption: 0,
  listSortBy: currentSort === 'real-cost' ? 'distance' : currentSort,
  bestRealCostStationIds: [],  // ← reset direct, pas de recalcul
})
```

Logique correcte : sans véhicule, le tableau est vide sans appel inutile à `getBestRealCostStation`.

### 6. `setVehicleType(type)` — recompute avec les valeurs du preset

Lorsqu'un preset est sélectionné, `computeBestStations` est appelé avec `preset.consumption` et `preset.tankCapacity` avant le `set`. Les badges "Coût/trajet" sont donc immédiatement à jour dès la sélection du véhicule.

### 7. Badge conditionnel "Coût/trajet"

```ts
const canUseRealCost = consumption > 0 && tankCapacity > 0 && referenceLocation !== null
```

Condition à trois critères — conforme à la spec. Le badge de tri n'apparaît que quand le calcul est possible.

### 8. Cohérence visuelle complète

Le badge "Coût/trajet" (icône `Scale`) est présent aux mêmes endroits que "Meilleur prix" (Euro) et "Plus proche" (Route) :
- `StationCard` dans la liste
- `PriceMarker` sur la carte avec animation ping
- `StationDetail` dans le header

### 9. Tri `real-cost` — logique et tri secondaire

```ts
const diff = costA - costB
if (diff !== 0) return diff
return distA - distB  // tri secondaire par distance ✅
```

Conforme à la spec.

### 10. `travelCost` intégré dans `FillEstimate`

La spec suggérait d'afficher `+X.XX€ trajet` directement dans `StationCard`. L'implémentation l'a passé en prop à `FillEstimate`, qui le rend en interne — `FillEstimate` reste l'unique responsable des estimations financières.

---

## ⚠️ Observations mineures (non bloquantes)

### OBS-1 : Légère incohérence de distance entre tri et affichage

Dans le `useMemo` de tri (`StationList/index.tsx`), `distA`/`distB` sont arrondis à 1 décimale. Dans `StationCard.tsx`, la distance pour `travelCost` n'est **pas** arrondie. Le `travelCost` affiché peut donc différer très légèrement du `travelCost` utilisé pour le tri. Impact utilisateur négligeable.

### OBS-2 : Pas de validation de `ps.listSortBy` pour `'price'`/`'distance'` dans `merge`

Le `merge` filtre uniquement le cas `'real-cost'` sans véhicule. Une valeur inconnue persistée en localStorage serait restaurée telle quelle. Impact nul en prod (l'UI ne produit que des valeurs valides).

### OBS-3 : `StationCard` accède au store en 3 abonnements séparés

`consumption`, `tankCapacity`, `fillHabit` sont lus via 3 `useAppStore()` séparés au lieu d'être passés en props. Abonnements fins corrects côté React, mais couplage fort au store. Acceptable dans ce contexte.

---

## Checklist Definition of Done

| Critère | Statut | Notes |
|---|---|---|
| `calculateEffectiveCost()` ajoutée dans `src/lib/utils.ts` | ✅ | Conforme à la spec |
| Type `listSortBy` étendu à `"real-cost"` dans le store | ✅ | Conforme |
| `setVehicleType(null)` remet `listSortBy` à `"distance"` si tri = `"real-cost"` | ✅ | Conforme |
| `merge` remet `listSortBy` à `"distance"` si `"real-cost"` restauré sans véhicule | ✅ | Conforme |
| Badge "Coût/trajet" visible uniquement si conditions remplies | ✅ | Conforme + renommé post-review |
| Tri par `effectiveCost` actif quand `listSortBy === "real-cost"` | ✅ | Conforme |
| `StationCard` affiche `+X.XX€ trajet` quand `listSortBy === "real-cost"` | ✅ | Via `FillEstimate` |
| Badge "Coût/trajet" dans `StationCard`, `PriceMarker`, `StationDetail` | ✅ | Ajouté post-review |
| `rtk lint` sans erreur bloquante | ✅ | 0 erreurs ESLint + 0 erreurs TypeScript |

---

## Modifications apportées post-review

| # | Modification | Motivation |
|---|---|---|
| 1 | "Coût réel" → "Coût/trajet", `TrendingDown` → `Scale` | Clarté du libellé, icône balance plus explicite |
| 2 | `getBestRealCostStation` dans `utils.ts` | Calcul de la meilleure station coût/trajet |
| 3 | `bestRealCostStationIds` dans le store | Tracking de la meilleure station, mis à jour dans tous les setters pertinents |
| 4 | `computeBestStations` — helper centralisé | Elimination de la duplication dans les setters du store |
| 5 | Badge `Scale` jaune dans `StationCard` | Cohérence visuelle avec Meilleur prix / Plus proche |
| 6 | Prop `isBestRealCost` dans `PriceMarker` | Badge sur les markers de la carte |
| 7 | Badge "Coût/trajet" dans `StationDetail` | Cohérence avec les badges existants |

---

## Recommandation

**Approuvé.** Tous les critères d'acceptation et le DoD sont remplis. Les améliorations post-review (badges de meilleure station coût/trajet) sont cohérentes avec le design system existant. OBS-1 reste un écart arithmétique négligeable. OBS-2 et OBS-3 n'ont aucun impact fonctionnel en production.

> Statut confirmé : `done`
