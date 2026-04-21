# Code Review — US-02-04 : Distances Routières Réelles (OSRM + Isodistance)

**Date :** 2026-03-31
**Branche :** epic-2
**Commits couverts :**
- `863b8e1` ✨ (Road distance) - Implement road distance mode with OSRM and IGN isodistance
- `7f3b146` ✨ (Road visualization) - Add road route visualization and improve distance handling
- `bc49942` ✨ (Travel time) - Add travel time display and route toggle

**Statut global : ✅ Approuvé avec corrections mineures**

---

## 1. Critères d'Acceptation — Vérification

| Critère | Statut | Remarque |
|---------|--------|----------|
| `distanceMode: 'road' \| 'crow-fly'` dans le store, persisté, défaut `'road'` | ✅ | `useAppStore.ts:90–99`, `partialize:329`, `merge:353` |
| Toggle "Route réelle" / "Vol d'oiseau" dans `StationListSettings` | ✅ | Section "Distances" implémentée `StationListSettings.tsx:268–292` |
| Mode `road` — liste : distances OSRM + indicateur `~` en fallback Haversine | ✅ | `StationList/index.tsx:88–93`, `StationCard.tsx:52–54` |
| Mode `crow-fly` — liste : Haversine uniquement, pas d'appel API | ✅ | Hook inactif si `distanceMode !== 'road'` (`useRoadDistances.ts:25`) |
| Mode `road` — carte : polygone isodistance IGN | ✅ | `useIsodistance.ts` + `InteractiveMap.tsx:132–134` |
| Mode `crow-fly` — carte : cercle existant inchangé | ✅ | Rendu conditionnel dans `InteractiveMap.tsx:126` |
| Fallback silencieux si OSRM ou IGN indisponible | ✅ | `roadDistances.ts:73-75`, `isodistance.ts:33` |
| Batch OSRM : max 100 stations triées par Haversine | ✅ | `roadDistances.ts:40–45`, `MAX_STATIONS_PER_BATCH = 100` |
| Indicateur `~` sur les distances Haversine temporaires en mode `road` | ✅ | `StationCard.tsx:93–94` |
| `rtk lint` sans erreur bloquante | ⚠️ | 1 erreur + 1 warning (voir §4) |

---

## 2. Points Forts

### Service `roadDistances.ts`
- **Retry automatique** (`fetchWithRetry`, 2 tentatives, backoff linéaire) : amélioration non spécifiée mais pertinente pour la résilience réseau mobile.
- **Double annotation OSRM** (`annotations=duration,distance`) : récupère distances ET durées en un seul appel, sans surcoût réseau.
- Le `clearTimeout` est correctement appelé dans le `catch` pour éviter les fuites d'AbortController.

### Hook `useRoadDistances.ts`
- **Cache par clé de position** : les résultats OSRM sont mémorisés par `locationKey` dans deux `useRef`. Un changement de localisation invalide le cache, un rechargement de page sans déplacement évite un appel API inutile. Bon équilibre performance/fraîcheur.
- **Pattern d'annulation** avec flag `cancelled` : évite les `setState` orphelins si le composant est démonté pendant le fetch.
- Réinitialise proprement `roadDistances` et `roadDurations` quand le mode passe à `crow-fly`.

### Hook `useIsodistance.ts`
- **`locationKey` string** : résout le problème classique d'égalité référentielle des tableaux dans les dépendances `useEffect` (ligne 16–18).
- Stockage dans le store Zustand plutôt qu'un état local : permet à `InteractiveMap` d'accéder à la géométrie sans prop-drilling.
- Vide l'ancienne géométrie (`setIsodistanceGeometry(null)`) avant chaque nouveau fetch : évite d'afficher un polygone périmé pendant le chargement.

### Store `useAppStore.ts`
- Séparation claire : `distanceMode` persisté, `roadDistances`/`roadDurations`/`isodistanceGeometry` non persistés.
- Validation dans `merge` : `ps.distanceMode === 'crow-fly' ? 'crow-fly' : 'road'` — safe against invalid persisted values.

### UX au-delà du spec
- **`StationList/index.tsx:305`** : skeleton complet au lieu du simple spinner `Loader2` spécifié. Meilleure expérience lors du premier chargement des distances routières.
- **Zoom automatique** sur le polygone isodistance à son arrivée (`InteractiveMap.tsx:261–281`).
- **Fonctionnalités bonus** (commits 7f3b146 et bc49942) : tracé de l'itinéraire animé + badge temps de trajet — cohérentes avec l'esprit de la story et non intrusives.

---

## 3. Écarts par rapport au Spec (Non-Bloquants)

| Point | Spec | Implémentation | Verdict |
|-------|------|----------------|---------|
| `useIsodistance` signature | Retourne `Geometry \| null` | Retourne `void`, stocke dans le store | ✅ Meilleure architecture |
| Fallback Haversine dans `fetchRoadDistances` | Retourne Haversine dans la Map | Retourne une `Map` vide, le UI gère le fallback | ✅ Séparation des responsabilités plus propre |
| Indicateur de chargement | Spinner `Loader2` à côté du label de MAJ | Skeleton complet de la liste | ✅ Meilleure UX |
| `roadDurations` dans le store | Non spécifié | Ajouté pour le temps de trajet | ✅ Extension cohérente |

---

## 4. Problèmes à Corriger

### 🔴 Erreur bloquante — `StationCard.tsx:38`

**Règle :** `@typescript-eslint/no-unused-vars`

```tsx
// L'interface déclare listSortBy mais le composant ne l'utilise pas
export interface StationCardProps {
  // ...
  listSortBy: 'price' | 'distance' | 'real-cost'  // ← déclaré
  // ...
}

export function StationCard({
  // ...
  listSortBy,  // ← L38 : reçu mais jamais utilisé dans le JSX
  // ...
}: StationCardProps)
```

**Correction :** Supprimer `listSortBy` de l'interface et de la déstructuration, ou — si le prop est prévu pour usage futur — le préfixer `_listSortBy` (mais dans ce projet, préférer la suppression simple).

---

### 🟡 Warning — `StationRoute.tsx:178`

**Règle :** `react-hooks/set-state-in-effect`

```tsx
useEffect(() => {
  if (!route?.isRoad || route.durationSeconds === null) {
    setShowBadge(false);  // ← L178 : appel synchrone dans l'effet
    return;
  }
  setShowBadge(false);    // ← L181 : reset synchrone avant setTimeout
  const timer = setTimeout(() => setShowBadge(true), ROAD_ANIMATION_MS)
  return () => clearTimeout(timer)
}, [route])
```

Le `setShowBadge(false)` synchrone à la ligne 181 est redondant (la ligne 180 dans l'autre branche fait la même chose, et le `setTimeout` part de `false` dans les deux cas). Il déclenche un render intermédiaire inutile.

**Correction :** Dériver `showBadge` depuis `route` sans state local :

```tsx
// Remplacer tout le useEffect + useState par un useMemo
const showBadge = useMemo(() => {
  // ... logique de timer → nécessite quand même un state
}, [route])
```

Alternative plus simple si un délai est requis : initialiser `showBadge` à `false` et ne faire qu'un seul `setTimeout` dans l'effet, sans reset synchrone.

---

## 5. Observations Mineures (Non-Bloquantes)

### `roadDistances.ts` — Timeout non annulé en cas d'erreur non-abort
Dans `fetchWithRetry`, si `fetch` échoue avec une erreur non liée à l'abort (ex. réseau coupé), le `clearTimeout(timeout)` dans le `catch` est bien appelé — **c'est correct**. ✅

### `useRoadDistances.ts` — Dépendance `filteredStations`
`filteredStations` est un tableau (référence) dans les dépendances de `useEffect`. Si `useFilteredStations` retourne une nouvelle référence à chaque render (même contenu), cela déclencherait le fetch inutilement. Vérifier que le hook est bien mémoïsé (en pratique il l'est via `useMemo` dans `useFilteredStations.ts`). ✅

### `isodistance.ts` — Cast `as Geometry | null`
```ts
return (data.geometry ?? data) as Geometry | null
```
Le cast est acceptable ici (API externe), mais `data` pourrait être `null` si l'API retourne `null` JSON. Le `?? null` final dans le `try` n'est pas atteint si `data` est `null` (car `null ?? null = null` ✅). Comportement correct.

### `useAppStore.ts` — `isodistanceGeometry` non initialisé dans l'état initial
```ts
isodistanceGeometry: null,  // L245 — correct
```
✅ Correct.

---

## 6. Résumé

**Qualité générale : Très bonne.** L'implémentation dépasse le spec sur plusieurs points (retry OSRM, cache de localisation, zoom auto sur isodistance, travel time) sans alourdir le code. La séparation services/hooks/composants est propre.

**Avant merge :**
1. Supprimer `listSortBy` de `StationCardProps` + déstructuration (`StationCard.tsx:38`)
2. Éliminer le `setShowBadge(false)` synchrone en L178 ou L181 dans `StationRoute.tsx`

Une fois ces deux points corrigés, la story est **Done**.
