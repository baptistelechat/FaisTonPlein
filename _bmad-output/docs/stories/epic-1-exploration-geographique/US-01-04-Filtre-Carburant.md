# US-01-04 : Filtres & Préférences Persistantes

**ID:** US-01-04
**Epic:** E01 - Exploration Géographique
**Priority:** Must Have
**Story Points:** 4
**Status:** Done

## User Story

**En tant que** conducteur,
**Je veux** filtrer les stations par carburant, par rayon de recherche et masquer les autoroutes,
**Afin de** n'afficher que les stations pertinentes selon mes habitudes, retrouvées automatiquement à chaque visite.

## Acceptance Criteria

- [x] **Filtre carburant persisté** : Le carburant sélectionné (`FuelTypeSelector`) est sauvegardé en `localStorage` et restauré au rechargement. Valeur par défaut : `Gazole`.
- [x] **Filtre rayon** : Un sélecteur de rayon permet de choisir parmi `5 km / 10 km / 20 km / 50 km / 100 km / Tous`. Seules les stations dans ce rayon (depuis `referenceLocation`) sont affichées sur la carte et dans la liste. Si `referenceLocation` est null, le filtre rayon est ignoré (toutes les stations affichées). Valeur par défaut : `20 km`.
> ⚠️ L'option "Tous" a été retirée au profit de 100 km maximum pour des raisons de performance.
- [x] **Filtre autoroutes** : Un toggle "Autoroutes" permet de masquer/afficher les stations dont `isHighway === true`. Valeur par défaut : `true` (stations autoroutières visibles).
- [x] **Filtres intégrés dans la StationList** : Les contrôles rayon et autoroutes sont affichés directement dans l'en-tête de `StationList`, sous la ligne titre/tri, sans modale ni overlay.
- [x] **Persistance complète** : Les 3 préférences (`selectedFuel`, `searchRadius`, `showHighwayStations`) sont sauvegardées ensemble dans `localStorage` via le middleware Zustand `persist`.
- [x] **Filtrage cohérent** : La carte et la liste affichent exactement les mêmes stations (même ensemble filtré).

## Technical Notes

### 1. Store — Nouvelles préférences

Ajouter dans `useAppStore.ts` :

```ts
searchRadius: number         // default: 20 (km), 0 = "Tous"
showHighwayStations: boolean // default: true
setSearchRadius: (radius: number) => void
setShowHighwayStations: (show: boolean) => void
```

Ajouter le middleware `persist` autour du store, en ne persistant **que** les préférences utilisateur :

```ts
import { persist } from 'zustand/middleware'

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({ ...existingStore }),
    {
      name: 'faistonplein-preferences',
      partialize: (state) => ({
        selectedFuel: state.selectedFuel,
        searchRadius: state.searchRadius,
        showHighwayStations: state.showHighwayStations,
      }),
    }
  )
)
```

> ⚠️ Valider la valeur restaurée de `selectedFuel` : si la valeur n'est pas un `FuelType` valide (parmi `FUEL_TYPES`), fallback sur `'Gazole'`.

### 2. Hook `useFilteredStations`

Créer `src/hooks/useFilteredStations.ts` pour centraliser le filtrage (évite la duplication entre `StationList` et `InteractiveMap`) :

```ts
export function useFilteredStations(): Station[]
```

Logique de filtrage (dans l'ordre) :
1. `selectedFuel` : `station.prices.some(p => p.fuel_type === selectedFuel)`
2. `showHighwayStations` : si `false`, exclure `station.isHighway === true`
3. `searchRadius` : si `> 0` et `referenceLocation` non null, exclure les stations à `distance > searchRadius` (utiliser `calculateDistance` de `src/lib/utils.ts`)

### 3. Composant `StationListFilters`

Créer `src/components/StationList/components/StationListFilters.tsx` (même convention que `StationListStats.tsx`).

Rendu dans `StationList/index.tsx`, sous la ligne titre/tri, au-dessus du bloc stats :

```
[ Titre "Autour de moi"      ] [ Distance ] [ Prix ]   ← existant (ligne 1)
[ 5km 10km 20km 50km 100km Tous ]  [ 🛣 Autoroutes ]   ← nouveau (ligne 2)
[ Min.  Médiane  Max.  📊   ]                          ← existant (stats)
```

**Ligne 2 — rayon** : suite de `Badge` cliquables (même style que les badges Distance/Prix existants) pour `5 / 10 / 20 / 50 / 100 / Tous`. Le badge actif passe en `variant="default"`.

**Ligne 2 — autoroutes** : `Badge` avec icône `Road` (déjà importé dans `StationList/index.tsx`) qui bascule entre `variant="default"` (inclus) et `variant="outline"` (masqué).

> Pas de nouvelle dépendance shadcn/ui requise — `Badge` est déjà utilisé dans `StationList`.

### 4. Intégration

- **`StationList/index.tsx`** : Ajouter `<StationListFilters />` entre la ligne titre/tri et le bloc stats. Remplacer `stations` brutes par `useFilteredStations()` comme source du `useMemo` de `sortedStations`.
- **`InteractiveMap.tsx`** : Utiliser `useFilteredStations()` comme source de marqueurs à la place de `stations` brutes.

## Dependencies

- **US-01-01** (Carte Interactive) : Le filtrage impacte les marqueurs affichés.
- **US-01-02** (Liste des Stations) : Le filtrage impacte la liste.

## Definition of Done

- [x] `useAppStore` utilise `persist` — les 3 prefs sont restaurées au rechargement.
- [x] `useFilteredStations` hook utilisé dans `StationList` et `InteractiveMap`.
- [x] `StationListFilters` rendu dans le header de `StationList`, fonctionnel.
- [x] Une valeur `selectedFuel` invalide en localStorage fallback sur `Gazole`.
- [x] Code review validée.
