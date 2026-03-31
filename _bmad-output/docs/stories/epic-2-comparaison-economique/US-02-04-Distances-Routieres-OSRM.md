# US-02-04 : Distances Routières Réelles (OSRM + Isodistance)

**ID:** US-02-04
**Epic:** E02 - Comparaison Économique
**Priority:** Could Have
**Story Points:** 8
**Status:** Ready for Dev

## User Story

**En tant que** conducteur,
**Je veux** choisir entre des distances à vol d'oiseau ou des distances routières réelles,
**Afin d'** avoir un affichage et des comparaisons adaptés à mes préférences.

## Acceptance Criteria

- [ ] **Préférence `distanceMode`** : Un nouveau champ `distanceMode: "road" | "crow-fly"` est ajouté au store, persisté, avec `"road"` comme valeur par défaut.
- [ ] **Toggle dans les settings** : Dans `StationListSettings`, une section "Distances" propose deux options — `Route` (isodistance) et `Vol d'oiseau` (cercle). La valeur est sauvegardée immédiatement.
- [ ] **Mode `"road"` — liste** : Les distances affichées dans `StationCard` et utilisées pour les tris (distance, coût réel) proviennent de l'API OSRM `/table`. Un indicateur `~` s'affiche tant que les distances routières ne sont pas encore chargées (fallback Haversine temporaire).
- [ ] **Mode `"crow-fly"` — liste** : Les distances affichées et utilisées pour les tris sont calculées en Haversine. Aucun appel API n'est effectué.
- [ ] **Mode `"road"` — carte** : La zone de rayon est représentée par un **polygone isodistance** récupéré depuis l'IGN (`bdtopo-pgr`). Le polygone se met à jour quand `referenceLocation` ou `searchRadius` change.
- [ ] **Mode `"crow-fly"` — carte** : La zone de rayon est représentée par le **cercle** actuel (comportement inchangé).
- [ ] **Fallback** : Si l'appel OSRM ou IGN échoue (réseau, timeout), le mode bascule silencieusement en Haversine/cercle sans message d'erreur bloquant.
- [ ] **Batch OSRM** : Maximum 100 stations par appel `/table` (triées par Haversine au préalable). Les stations au-delà gardent leur distance Haversine avec indicateur `~`.

## Technical Notes

### 1. Mise à jour du store `src/store/useAppStore.ts`

```ts
// Nouveaux champs dans AppStore
distanceMode: 'road' | 'crow-fly'
roadDistances: Record<string, number>       // non persisté
isLoadingRoadDistances: boolean             // non persisté
setDistanceMode: (mode: 'road' | 'crow-fly') => void
setRoadDistances: (distances: Record<string, number>) => void
setIsLoadingRoadDistances: (loading: boolean) => void
```

Initialisation :

```ts
distanceMode: 'road',
roadDistances: {},
isLoadingRoadDistances: false,
setDistanceMode: (distanceMode) => set({ distanceMode }),
setRoadDistances: (roadDistances) => set({ roadDistances }),
setIsLoadingRoadDistances: (isLoadingRoadDistances) => set({ isLoadingRoadDistances }),
```

Dans `partialize` — ajouter `distanceMode` (persisté) mais pas `roadDistances` ni `isLoadingRoadDistances` :

```ts
partialize: (state) => ({
  // ... existants ...
  distanceMode: state.distanceMode,
}),
```

Dans `merge` — valider `distanceMode` :

```ts
distanceMode: ps.distanceMode === 'crow-fly' ? 'crow-fly' : 'road',
```

---

### 2. Nouveau service `src/lib/roadDistances.ts`

```ts
import { calculateDistance } from '@/lib/utils'
import { Station } from '@/store/useAppStore'

const OSRM_TABLE_URL = 'https://router.project-osrm.org/table/v1/driving'
const MAX_STATIONS_PER_BATCH = 100
const OSRM_TIMEOUT_MS = 5000

export async function fetchRoadDistances(
  origin: [number, number],  // [lon, lat]
  stations: Station[],
): Promise<Map<string, number>> {
  const sorted = [...stations].sort(
    (a, b) =>
      calculateDistance(origin[1], origin[0], a.lat, a.lon) -
      calculateDistance(origin[1], origin[0], b.lat, b.lon),
  )
  const batch = sorted.slice(0, MAX_STATIONS_PER_BATCH)

  const coords = [
    `${origin[0]},${origin[1]}`,
    ...batch.map((s) => `${s.lon},${s.lat}`),
  ].join(';')

  const url = `${OSRM_TABLE_URL}/${coords}?sources=0&destinations=all&annotations=distance`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) throw new Error(`OSRM ${res.status}`)

    const data = await res.json()
    const distances: (number | null)[] = data.distances[0]

    const result = new Map<string, number>()
    batch.forEach((station, i) => {
      const meters = distances[i + 1]  // index 0 = origin→origin = 0
      if (meters !== null && meters > 0) {
        result.set(station.id, Math.round((meters / 1000) * 10) / 10)
      }
    })
    return result
  } catch {
    // Fallback silencieux : Haversine
    const fallback = new Map<string, number>()
    batch.forEach((station) => {
      fallback.set(
        station.id,
        Math.round(calculateDistance(origin[1], origin[0], station.lat, station.lon) * 10) / 10,
      )
    })
    return fallback
  }
}
```

---

### 3. Nouveau service `src/lib/isodistance.ts`

```ts
const IGN_ISOCHRONE_URL = 'https://data.geopf.fr/navigation/isochrone'
const IGN_TIMEOUT_MS = 6000

export async function fetchIsodistance(
  origin: [number, number],  // [lon, lat]
  radiusKm: number,
): Promise<GeoJSON.Geometry | null> {
  const params = new URLSearchParams({
    resource: 'bdtopo-pgr',
    profile: 'car',
    costType: 'distance',
    costValue: String(radiusKm * 1000),  // mètres
    point: `${origin[0]},${origin[1]}`,
    direction: 'departure',
    geometryFormat: 'geojson',
  })

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), IGN_TIMEOUT_MS)
    const res = await fetch(`${IGN_ISOCHRONE_URL}?${params}`, {
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) throw new Error(`IGN ${res.status}`)

    const data = await res.json()
    // La réponse IGN est un GeoJSON avec une propriété geometry ou un Feature
    return data.geometry ?? data ?? null
  } catch {
    return null  // Fallback : le cercle existant reste affiché
  }
}
```

---

### 4. Hook `src/hooks/useRoadDistances.ts`

Déclenche le fetch OSRM uniquement quand `distanceMode === "road"` :

```ts
'use client'

import { fetchRoadDistances } from '@/lib/roadDistances'
import { useFilteredStations } from '@/hooks/useFilteredStations'
import { useAppStore } from '@/store/useAppStore'
import { useEffect } from 'react'

export function useRoadDistances() {
  const {
    userLocation,
    searchLocation,
    distanceMode,
    setRoadDistances,
    setIsLoadingRoadDistances,
  } = useAppStore()
  const filteredStations = useFilteredStations()
  const referenceLocation = searchLocation ?? userLocation

  useEffect(() => {
    if (distanceMode !== 'road' || !referenceLocation || filteredStations.length === 0) {
      setRoadDistances({})
      return
    }

    setIsLoadingRoadDistances(true)
    fetchRoadDistances(referenceLocation, filteredStations).then((map) => {
      setRoadDistances(Object.fromEntries(map))
      setIsLoadingRoadDistances(false)
    })
  }, [referenceLocation, filteredStations, distanceMode, setRoadDistances, setIsLoadingRoadDistances])
}
```

Monter ce hook **une seule fois** dans `DesktopLayout` et `MobileLayout`.

---

### 5. Mise à jour de `StationList/index.tsx`

Extraire depuis le store :

```ts
const { ..., roadDistances, isLoadingRoadDistances, distanceMode } = useAppStore()
```

Helper pour la distance effective d'une station :

```ts
const getEffectiveDistance = (station: Station): number => {
  if (distanceMode === 'road' && roadDistances[station.id] !== undefined) {
    return roadDistances[station.id]
  }
  return (
    Math.round(
      calculateDistance(referenceLocation![1], referenceLocation![0], station.lat, station.lon) * 10,
    ) / 10
  )
}
```

Remplacer `distA` / `distB` dans le `useMemo` :

```ts
const distA = getEffectiveDistance(a)
const distB = getEffectiveDistance(b)
```

Ajouter `roadDistances` et `distanceMode` dans les dépendances du `useMemo`.

Indicateur de chargement discret (à côté du label de mise à jour) :

```tsx
{distanceMode === 'road' && isLoadingRoadDistances && (
  <span className='text-muted-foreground flex items-center gap-1 text-[11px]'>
    <Loader2 className='size-3 animate-spin' />
    Calcul des distances...
  </span>
)}
```

---

### 6. Mise à jour de `StationCard.tsx`

```ts
const roadDistances = useAppStore((s) => s.roadDistances)
const distanceMode = useAppStore((s) => s.distanceMode)

const haversineDistance = referenceLocation
  ? Math.round(
      calculateDistance(referenceLocation[1], referenceLocation[0], station.lat, station.lon) * 10,
    ) / 10
  : null

const roadDistance = roadDistances[station.id] ?? null
const distance = distanceMode === 'road' && roadDistance !== null
  ? roadDistance
  : haversineDistance

// true = distance routière disponible, false = fallback vol d'oiseau
const isExactDistance = distanceMode === 'road' && roadDistance !== null
```

Affichage de la distance :

```tsx
{distance !== null && (
  <span className='text-primary/80 flex shrink-0 items-center gap-0.5 whitespace-nowrap'>
    <Navigation className='size-3' />
    {distance.toFixed(1)} km{!isExactDistance && ' ~'}
  </span>
)}
```

---

### 7. Toggle dans `StationListSettings.tsx`

Ajouter une section "Distances" après la section "Affichage" :

```tsx
import { distanceMode, setDistanceMode } = useAppStore()

// ...

<Separator />
<div className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
  Distances
</div>
<div className='grid grid-cols-2 gap-1.5'>
  {(
    [
      { value: 'road', label: 'Route réelle', icon: Navigation },
      { value: 'crow-fly', label: 'Vol d\'oiseau', icon: Bird },
    ] as const
  ).map(({ value, label, icon: Icon }) => (
    <button
      key={value}
      onClick={() => setDistanceMode(value)}
      className={cn(
        'flex items-center gap-1.5 rounded-lg border p-2 text-left text-xs transition-all',
        distanceMode === value
          ? 'border-primary bg-primary/5 text-primary font-semibold'
          : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground',
      )}
    >
      <Icon className='size-3.5 shrink-0' />
      {label}
    </button>
  ))}
</div>
```

Import Lucide : `Bird` et `Navigation` depuis `lucide-react`.

---

### 8. Mise à jour de la carte `InteractiveMap.tsx`

#### 8a. Hook `src/hooks/useIsodistance.ts`

```ts
'use client'

import { fetchIsodistance } from '@/lib/isodistance'
import { useAppStore } from '@/store/useAppStore'
import { useEffect, useState } from 'react'

export function useIsodistance() {
  const { userLocation, searchLocation, searchRadius, distanceMode } = useAppStore()
  const referenceLocation = searchLocation ?? userLocation
  const [geometry, setGeometry] = useState<GeoJSON.Geometry | null>(null)

  useEffect(() => {
    if (distanceMode !== 'road' || !referenceLocation) {
      setGeometry(null)
      return
    }

    fetchIsodistance(referenceLocation, searchRadius).then(setGeometry)
  }, [referenceLocation, searchRadius, distanceMode])

  return geometry
}
```

#### 8b. Dans `InteractiveMap.tsx`

```tsx
import { useIsodistance } from '@/hooks/useIsodistance'
import { useAppStore } from '@/store/useAppStore'
import { Source, Layer } from 'react-map-gl/maplibre'

const distanceMode = useAppStore((s) => s.distanceMode)
const isodistanceGeometry = useIsodistance()
```

Remplacer le rendu du cercle de rayon par un rendu conditionnel :

```tsx
{/* Zone de rayon — isodistance ou cercle selon le mode */}
{distanceMode === 'road' && isodistanceGeometry ? (
  <Source id='isodistance' type='geojson' data={{ type: 'Feature', geometry: isodistanceGeometry, properties: {} }}>
    <Layer
      id='isodistance-fill'
      type='fill'
      paint={{ 'fill-color': '#3b82f6', 'fill-opacity': 0.08 }}
    />
    <Layer
      id='isodistance-outline'
      type='line'
      paint={{ 'line-color': '#3b82f6', 'line-width': 1.5, 'line-dasharray': [3, 2] }}
    />
  </Source>
) : distanceMode === 'crow-fly' ? (
  // ... cercle existant inchangé ...
  <>{existingCircleJSX}</>
) : null}
```

Quand `distanceMode === "road"` mais que le polygone n'est pas encore chargé (`isodistanceGeometry === null`), rien n'est affiché — pas de fallback cercle pour éviter la confusion visuelle.

---

## Dependencies

- **US-02-03** : `roadDistances` améliore automatiquement la précision de `calculateEffectiveCost` sans modification de US-02-03.
- `useFilteredStations` et `InteractiveMap` doivent exister (déjà présents).

## Definition of Done

- [ ] `distanceMode: 'road' | 'crow-fly'` dans le store, persisté, défaut `'road'`.
- [ ] `src/lib/roadDistances.ts` avec `fetchRoadDistances` et fallback Haversine.
- [ ] `src/lib/isodistance.ts` avec `fetchIsodistance` et fallback `null`.
- [ ] `useRoadDistances` hook monté dans les layouts, actif uniquement si `distanceMode === 'road'`.
- [ ] `useIsodistance` hook utilisé dans `InteractiveMap`.
- [ ] Section "Distances" visible dans `StationListSettings` avec toggle `Route réelle` / `Vol d'oiseau`.
- [ ] En mode `"road"` : distances routières dans la liste + polygone isodistance sur la carte.
- [ ] En mode `"crow-fly"` : Haversine dans la liste + cercle sur la carte (comportement actuel).
- [ ] Indicateur `~` sur les distances Haversine temporaires en mode `"road"`.
- [ ] Fallback silencieux si OSRM ou IGN est indisponible (offline DevTools → aucune erreur visible).
- [ ] `rtk lint` sans erreur bloquante.
- [ ] Test visuel : passer de `Vol d'oiseau` → `Route réelle` dans les settings → les distances de la liste se mettent à jour après ~1s, le cercle de la carte est remplacé par un polygone irrégulier. Repasser en `Vol d'oiseau` → retour immédiat au cercle et aux distances Haversine.
