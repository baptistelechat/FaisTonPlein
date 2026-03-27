# Code Review — Epic 2

**Date :** 2026-03-27
**Branche :** epic-2
**Reviewer :** Claude Code

---

## Résumé

Review complète du code produit sur la branche `epic-2`. 9 issues identifiées, toutes corrigées dans la foulée.

---

## Issues identifiées et corrections

### #1 — Logique de filtrage dupliquée (Sévérité : haute)

**Problème :** La même logique de filtrage par localisation (highway + rayon) était copiée-collée dans trois endroits indépendants :
- `src/hooks/useFilteredStations.ts`
- `src/hooks/useFilteredStats.ts`
- `src/store/useAppStore.ts` (fonction interne `getFilteredStations`)

**Correction :** Extraction d'une fonction utilitaire générique `filterStationsByLocation<T>` dans `src/lib/utils.ts`, partagée par les trois fichiers. Chaque consommateur applique ensuite ses filtres spécifiques (ex: filtre carburant dans `useFilteredStations`).

**Fichiers modifiés :** `src/lib/utils.ts`, `src/hooks/useFilteredStations.ts`, `src/hooks/useFilteredStats.ts`, `src/store/useAppStore.ts`

---

### #2 — `conn` dead code dans DuckDBContext (Sévérité : haute)

**Problème :** Le contexte `DuckDBContext` exposait une propriété `conn` (connexion DuckDB persistante) qui n'était jamais consommée. `FuelDataLoader` crée ses propres connexions via `db.connect()`. La connexion était ouverte et maintenue en mémoire inutilement.

**Correction :** Suppression de `conn` de l'interface `DuckDBContextType`, du state, de l'initialisation et de la valeur du provider.

**Fichiers modifiés :** `src/components/DuckDBProvider.tsx`

---

### #3 — Spinner affiché sur l'état vide (Sévérité : haute)

**Problème :** Quand `sortedStations.length === 0`, un spinner `animate-spin` était affiché avec le message "Aucune station trouvée", même quand les données étaient chargées et qu'il n'y avait simplement aucune station dans la zone. L'utilisateur pensait que l'application chargeait encore.

**Correction :** Distinction des deux états via `isLoading` du store :
- `isLoading === true` → spinner seul, sans message
- `isLoading === false && sortedStations.length === 0` → message sans spinner

**Fichiers modifiés :** `src/components/StationList/index.tsx`

---

### #4 — Magic string `'Station service'` utilisé comme sentinel (Sévérité : haute)

**Problème :** La chaîne `'Station service'` (nom par défaut du mapper) était utilisée comme valeur sentinelle pour détecter si le nom d'une station avait été résolu. C'est fragile et redondant : `station.name` vaut toujours `'Station service'` depuis le mapper, donc la condition `station.name === 'Station service'` était toujours vraie.

**Note :** `'Station service'` est conservé comme valeur d'affichage fallback (`displayName = resolvedName ?? station.name`), seul le rôle de sentinel est supprimé.

**Correction :** Remplacement de `station.name === 'Station service' && !resolvedNames[id]` par simplement `!resolvedNames[id]`, et `isNameLoading = resolvedName === undefined`.

**Fichiers modifiés :** `src/components/StationList/index.tsx`

---

### #5 — Pattern derived state causant un double render (Sévérité : moyenne)

**Problème :** Le reset de `visibleCount` lors du changement de `sortedStations` utilisait le pattern anti-recommandé `setState pendant le render` (getDerivedStateFromProps), provoquant un render supplémentaire inutile à chaque changement de liste.

**Correction :** Remplacement par un `useEffect` sur `sortedStations` qui appelle `setVisibleCount(PAGE_SIZE)`. Suppression du state `prevSortedStations`.

**Fichiers modifiés :** `src/components/StationList/index.tsx`

---

### #6 — `capitalize` dans le mauvais module (Sévérité : moyenne)

**Problème :** La fonction utilitaire générique `capitalize` était définie dans `src/lib/priceFreshness.ts`, un module métier spécifique à la fraîcheur des prix. Tout consommateur avait un import trompeur.

**Correction :** Déplacement de `capitalize` dans `src/lib/utils.ts`. `priceFreshness.ts` l'importe maintenant depuis `utils`.

**Fichiers modifiés :** `src/lib/utils.ts`, `src/lib/priceFreshness.ts`, `src/components/StationList/index.tsx`

---

### #7 — Transformation d'adresse inline dans le composant (Sévérité : moyenne)

**Problème :** La capitalisation de la première lettre de l'adresse était effectuée à chaque render dans `StationCard` : `station.address.charAt(0).toUpperCase() + station.address.slice(1)`. Cette transformation doit être faite une fois lors du mapping des données.

**Correction :** Déplacement de la capitalisation dans `src/lib/mappers.ts` (lors de la construction du champ `address`). `StationCard` utilise désormais `station.address` directement.

**Fichiers modifiés :** `src/lib/mappers.ts`, `src/components/StationList/index.tsx`

---

### #8 — `selectedStation` orpheline après rechargement des données (Sévérité : faible)

**Problème :** Lors d'un rechargement des données (appel à `setStations`), si une station était sélectionnée, `selectedStation` dans le store continuait de pointer vers l'ancien objet JavaScript. Techniquement fonctionnel (les IDs restaient valides), mais incohérent pour le clean code.

**Correction :** Dans `setStations`, après mise à jour du tableau `stations`, recherche de la station correspondante (par `id`) dans le nouveau tableau. Si trouvée, `selectedStation` est mis à jour avec le nouvel objet ; sinon, remis à `null`.

**Fichiers modifiés :** `src/store/useAppStore.ts`

---

### #9 — `console.log` en production (Sévérité : faible)

**Problème :** Un `console.log` de debug dans `FuelDataLoader.tsx` affichait le nombre de stations chargées à chaque fetch. Un toast de succès remplit déjà ce rôle pour l'utilisateur.

**Correction :** Suppression du `console.log`.

**Fichiers modifiés :** `src/components/FuelDataLoader.tsx`

---

## Tableau récapitulatif

| # | Sévérité | Statut | Fichiers |
|---|----------|--------|---------|
| 1 | Haute | Corrigé | `utils.ts`, `useFilteredStations.ts`, `useFilteredStats.ts`, `useAppStore.ts` |
| 2 | Haute | Corrigé | `DuckDBProvider.tsx` |
| 3 | Haute | Corrigé | `StationList/index.tsx` |
| 4 | Haute | Corrigé | `StationList/index.tsx` |
| 5 | Moyenne | Corrigé | `StationList/index.tsx` |
| 6 | Moyenne | Corrigé | `utils.ts`, `priceFreshness.ts`, `StationList/index.tsx` |
| 7 | Moyenne | Corrigé | `mappers.ts`, `StationList/index.tsx` |
| 8 | Faible | Corrigé | `useAppStore.ts` |
| 9 | Faible | Corrigé | `FuelDataLoader.tsx` |
