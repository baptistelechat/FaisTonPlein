# Code Review — 31/03/2026

**Date :** 2026-03-31
**Branche :** epic-2
**Reviewer :** Claude Code

***

## Résumé

Review complète du code produit sur la branche `epic-2` avant clôture par rétrospective. 15 issues identifiées et corrigées : 1 bug, 1 incohérence UX, 1 amélioration UX, 1 code mort, et 11 violations DRY.

***

## Issues identifiées et corrigées

### #1 — Stats (min/max/médiane) incohérentes avec la liste en mode route (Sévérité : haute)

**Problème :** `useFilteredStats` et `useFilteredStations` ne filtraient pas sur le même ensemble de stations en mode route réelle. Le bandeau de stats affichait des valeurs calculées sur des stations absentes de la liste.

**Correction :** Ajout du filtre `applyIsodistanceFilter` dans `useFilteredStats` pour aligner les deux hooks sur la même géométrie source de vérité.

**Fichiers modifiés :** `src/hooks/useFilteredStats.ts`

***

### #2 — Badge "Meilleur coût/trajet" incohérent avec le tri de la liste (Sévérité : haute)

**Problème :** `getBestRealCostStation` calculait toujours avec la distance Haversine pour les badges, tandis que le tri de la liste utilisait les distances routières OSRM. Badge et position #1 ne correspondaient pas en mode route.

**Correction :** Ajout de `roadDistances` en paramètre optionnel de `getBestRealCostStation`, `getBestStationsForFuel` et `computeBestStations`. `setRoadDistances` dans le store recalcule désormais les badges dès que les distances OSRM arrivent.

**Fichiers modifiés :** `src/lib/utils.ts`, `src/store/useAppStore.ts`, `src/components/StationList/index.tsx`

***

### #3 — Code commenté laissé dans le codebase (Sévérité : faible)

**Problème :** Un bloc `toast.info` commenté traînait dans la gestion d'erreur de géolocalisation.

**Correction :** Suppression du bloc commenté.

**Fichiers modifiés :** `src/components/InteractiveMap.tsx`

***

### #4 — Comparaison de classes CSS Tailwind dans `PriceCard` (Sévérité : faible)

**Problème :** `PriceCard` comparait les strings Tailwind retournées par `getPriceTextColor` pour déduire le niveau (bon/mauvais prix) — couplage fragile sur les détails d'implémentation.

**Correction :** Extraction de `getPriceLevel()` dans `priceColor.ts` (retourne `'good' | 'neutral' | 'bad'`). `getPriceTextColor` et `getPriceMarkerClasses` l'utilisent en interne. `PriceCard` utilise directement `getPriceLevel`.

**Fichiers modifiés :** `src/lib/priceColor.ts`, `src/components/StationDetail/components/PriceCard.tsx`

***

### #5 — Magic numbers dupliqués dans `FillEstimate` (Sévérité : faible)

**Problème :** `getFillLabel` hard-codait les valeurs `1.0`, `0.9`, `0.75`, `0.5`, `0.25` dans un `switch`, dupliquant `FILL_HABIT_OPTIONS` avec des labels légèrement différents.

**Correction :** Remplacement du `switch` par `FILL_HABIT_OPTIONS.find(o => o.value === fillHabit)?.label`. Source de vérité unique.

**Fichiers modifiés :** `src/components/FillEstimate.tsx`

***

### #6 — `getPriceMarkerClasses` dupliquait les seuils p25/p75 (Sévérité : faible)

**Problème :** `getPriceMarkerClasses` répétait les mêmes seuils que `getPriceLevel` au lieu d'en déléguer la logique.

**Correction :** Ajout de `PRICE_LEVEL_MARKER_CLASSES` + réécriture de `getPriceMarkerClasses` pour utiliser `getPriceLevel`.

**Fichiers modifiés :** `src/lib/priceColor.ts`

***

### #7 — Absence de badge distance sur la ligne crow-fly (Amélioration UX)

**Problème :** En mode route, la ligne affichait un badge de durée (`~12 min`). En mode vol d'oiseau, la ligne pointillée n'affichait aucune information.

**Correction :** Ajout de `distanceKm` dans le type `RouteGeometry`. `StationRoute` affiche désormais un badge `~X.X km` (en `bg-sky-600`) sur le midpoint de la ligne crow-fly. Le `~` rappelle explicitement que c'est une approximation.

**Fichiers modifiés :** `src/hooks/useRouteGeometry.ts`, `src/components/StationRoute.tsx`

***

### #8 — Calcul inline de distance Haversine dupliqué (Sévérité : faible)

**Problème :** `StationCard` et `StationDetail` recalculaient `Math.round(calculateDistance(...) * 10) / 10` en inline alors que `getStationDistance()` existait déjà dans `utils.ts`.

**Correction :** Remplacement des calculs inline par `getStationDistance(station, referenceLocation)`.

**Fichiers modifiés :** `src/components/StationList/components/StationCard.tsx`, `src/components/StationDetail/index.tsx`

***

### #9 — Logique de recherche d'adresse dupliquée (Sévérité : haute)

**Problème :** `SearchBar` et `SearchPanel` contenaient une logique quasi-identique : debounce 500ms, guard `isSelectionRef`, `handleSelect` avec les mêmes 5 setters + toast.

**Correction :** Extraction d'un hook `useAddressSearch({ onSelect? })` partagé. Les deux composants ne gardent que leur UI.

**Fichiers créés :** `src/hooks/useAddressSearch.ts`
**Fichiers modifiés :** `src/components/SearchBar.tsx`, `src/components/SearchPanel.tsx`

***

### #10 — Handlers de navigation dupliqués dans `StationDetail` (Sévérité : faible)

**Problème :** `handleNavigateGoogleMaps` et `handleNavigateWaze` étaient deux fonctions quasi-identiques (même `window.open` + même `toast.info`).

**Correction :** Fusion en un seul `handleNavigate(url: string)`.

**Fichiers modifiés :** `src/components/StationDetail/index.tsx`

***

### #11 — Pattern `referenceLocation` copié-collé dans 5+ fichiers (Sévérité : moyenne)

**Problème :** `const referenceLocation = searchLocation ?? userLocation` apparaissait dans `useFilteredStations`, `useFilteredStats`, `StationList`, `StationListSettings`, `StationDetail`, etc.

**Correction :** Extraction du hook `useReferenceLocation()`.

**Fichiers créés :** `src/hooks/useReferenceLocation.ts`
**Fichiers modifiés :** `src/hooks/useFilteredStations.ts`, `src/hooks/useFilteredStats.ts`, `src/components/StationList/index.tsx`, `src/components/StationList/components/StationListSettings.tsx`

***

### #12 — `useMediaQuery("(min-width: 768px)")` dupliqué dans 4 fichiers (Sévérité : faible)

**Problème :** La même query media était répétée à l'identique dans `page.tsx`, `StationList`, `StationListSettings`, `StationListStats`.

**Correction :** Extraction du hook `useIsDesktop()`.

**Fichiers créés :** `src/hooks/useIsDesktop.ts`
**Fichiers modifiés :** `src/app/page.tsx`, `src/components/StationList/index.tsx`, `src/components/StationList/components/StationListSettings.tsx`, `src/components/StationList/components/StationListStats.tsx`

***

### #13 — Filtre isodistance dupliqué entre les deux hooks de filtrage (Sévérité : faible)

**Problème :** Le bloc `if (distanceMode === 'road' && isodistanceGeometry) { ... filter isPointInGeometry ... }` était identique dans `useFilteredStations` et `useFilteredStats`.

**Correction :** Extraction de `applyIsodistanceFilter<T>()` dans `utils.ts`.

**Fichiers modifiés :** `src/lib/utils.ts`, `src/hooks/useFilteredStations.ts`, `src/hooks/useFilteredStats.ts`

***

### #14 — Pattern `StatRow` répété 11+ fois dans `StationListStats` (Sévérité : moyenne)

**Problème :** `StationListStats` répétait 11+ fois le même pattern `<div className="flex items-center justify-between">` pour afficher chaque ligne de statistique.

**Correction :** Extraction d'un composant local `StatRow` en tête de fichier.

**Fichiers modifiés :** `src/components/StationList/components/StationListStats.tsx`

***

### #15 — `useEffect` redondant dans `SearchBar` (Sévérité : faible)

**Problème :** Un `useEffect` sur `results` appelait `setOpen(true)` alors que le `onChange` de l'input le fait déjà avant l'appel asynchrone. L'effet violait la règle `react-hooks/set-state-in-effect`.

**Correction :** Suppression de l'effet redondant.

**Fichiers modifiés :** `src/components/SearchBar.tsx`

***

## Tableau récapitulatif

| #  | Sévérité | Statut  | Fichiers principaux                                             |
| -- | -------- | ------- | --------------------------------------------------------------- |
| 1  | Haute    | Corrigé | `useFilteredStats.ts`                                          |
| 2  | Haute    | Corrigé | `utils.ts`, `useAppStore.ts`                                   |
| 3  | Faible   | Corrigé | `InteractiveMap.tsx`                                           |
| 4  | Faible   | Corrigé | `priceColor.ts`, `PriceCard.tsx`                               |
| 5  | Faible   | Corrigé | `FillEstimate.tsx`                                             |
| 6  | Faible   | Corrigé | `priceColor.ts`                                                |
| 7  | UX       | Corrigé | `useRouteGeometry.ts`, `StationRoute.tsx`                      |
| 8  | Faible   | Corrigé | `StationCard.tsx`, `StationDetail/index.tsx`                   |
| 9  | Haute    | Corrigé | `useAddressSearch.ts` (nouveau), `SearchBar.tsx`, `SearchPanel.tsx` |
| 10 | Faible   | Corrigé | `StationDetail/index.tsx`                                      |
| 11 | Moyenne  | Corrigé | `useReferenceLocation.ts` (nouveau), 4 consommateurs           |
| 12 | Faible   | Corrigé | `useIsDesktop.ts` (nouveau), 4 consommateurs                   |
| 13 | Faible   | Corrigé | `utils.ts`, `useFilteredStations.ts`, `useFilteredStats.ts`    |
| 14 | Moyenne  | Corrigé | `StationListStats.tsx`                                         |
| 15 | Faible   | Corrigé | `SearchBar.tsx`                                                |
