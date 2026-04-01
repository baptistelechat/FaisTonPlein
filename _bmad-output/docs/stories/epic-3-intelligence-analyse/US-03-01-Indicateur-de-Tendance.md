# Story 3.1 : Indicateur de Tendance

**Status:** review

## Story

**En tant que** conducteur,
**Je veux** savoir si le prix est en hausse ou en baisse,
**Afin de** décider si je dois faire le plein maintenant ou attendre.

## Acceptance Criteria

1. Une flèche (↑ hausse / ↓ baisse / → stable) s'affiche à côté du prix du carburant sélectionné dans `StationCard` (vue liste).
2. La même flèche s'affiche dans `PriceCard` pour chaque carburant (vue détail station).
3. Le calcul compare le prix actuel avec la moyenne des 7 derniers jours (J-1 à J-7) pour la même station et le même carburant.
4. Si les données historiques sont indisponibles (fichier manquant, erreur réseau), aucun indicateur n'est affiché — aucune erreur visible.
5. Le chargement des données historiques se déclenche une seule fois lorsque `selectedDepartment` change (pas à chaque rendu).

## Tasks / Subtasks

- [x] Task 1 : Ajouter `TrendDirection` et `priceTrends` au store (AC: #1, #2, #3)
  - [x] Définir le type `TrendDirection = 'up' | 'down' | 'stable'` dans `src/lib/priceTrends.ts`
  - [x] Ajouter `priceTrends: Record<string, TrendDirection>` dans `AppStore` (non persisté)
  - [x] Ajouter `setPriceTrends: (trends: Record<string, TrendDirection>) => void`
  - [x] Ne PAS ajouter `priceTrends` dans `partialize` (recalculé à chaque session)

- [x] Task 2 : Créer `src/lib/priceTrends.ts` (AC: #3, #4)
  - [x] Exporter `TrendDirection = 'up' | 'down' | 'stable'`
  - [x] Implémenter `buildTrendKey(stationId: string, fuelType: FuelType): string` → `${stationId}_${fuelType}`
  - [x] Implémenter `getLast7DayUrls(dept: string): string[]` — génère les 7 URLs de fichiers consolidés journaliers (J-1 à J-7)
  - [x] Implémenter `fetchPriceTrends(db, stations, fuelType, dept): Promise<Record<string, TrendDirection>>` — query DuckDB, calcul AVG 7j, comparaison ±1%

- [x] Task 3 : Créer `src/hooks/usePriceTrends.ts` (AC: #4, #5)
  - [x] Se déclenche sur changement de `selectedDepartment` + disponibilité de `db`
  - [x] Appelle `fetchPriceTrends` et dispatch `setPriceTrends`
  - [x] Fallback silencieux (`try/catch` global, ne pas propager l'erreur)

- [x] Task 4 : Créer `src/components/TrendIndicator.tsx` (AC: #1, #2)
  - [x] Props : `direction: TrendDirection | null`, `className?: string`
  - [x] `null` → `return null` (rien affiché)
  - [x] Icônes Lucide : `TrendingUp` (hausse), `TrendingDown` (baisse), `Minus` (stable)
  - [x] Couleurs : hausse = `text-rose-500`, baisse = `text-emerald-500`, stable = `text-muted-foreground`

- [x] Task 5 : Intégrer `TrendIndicator` dans `StationCard` (AC: #1)
  - [x] Lire `priceTrends` depuis le store avec selector
  - [x] Afficher `TrendIndicator` à côté du prix sélectionné (colonne de droite)

- [x] Task 6 : Intégrer `TrendIndicator` dans `PriceCard` (AC: #2)
  - [x] Lire `priceTrends` depuis le store avec selector
  - [x] Afficher `TrendIndicator` pour le carburant de la card (header de la card)

- [x] Task 7 : Monter `usePriceTrends` dans les layouts (AC: #5)
  - [x] Appel `usePriceTrends()` dans `DesktopLayout` (à côté de `useRoadDistances()`)
  - [x] Appel `usePriceTrends()` dans `MobileLayout` (même pattern)

- [x] Task 8 : Lint et validation visuelle (AC: #4)
  - [x] `rtk lint` sans erreur bloquante
  - [x] Test visuel : flèches visibles dans la liste et dans le détail d'une station
  - [x] Test dégradé : couper le réseau en DevTools → aucun indicateur, aucune erreur visible

## Dev Notes

### Architecture du calcul de tendance

**Source des données :** Fichiers Parquet consolidés journaliers sur Hugging Face. Schéma identique aux fichiers `latest`.

**URL pattern :**
```
https://huggingface.co/datasets/baptistelechat/fais-ton-plein_dataset/resolve/main/data/consolidated/daily/year={year}/month={month}/day={day}/code_departement={dept}/data_0.parquet
```

**Algorithme dans `fetchPriceTrends` :**
1. `getLast7DayUrls(dept)` génère les URLs pour J-1 à J-7 (pas J-0, les données du jour peuvent être incomplètes)
2. DuckDB exécute une requête groupée sur tous les fichiers disponibles
3. Pour chaque station : comparer prix actuel vs moyenne 7j
   - `currentPrice > avg7d * 1.01` → `'up'`
   - `currentPrice < avg7d * 0.99` → `'down'`
   - sinon → `'stable'`
4. Stations sans historique (`avg7d === null`) → absentes du résultat → `TrendIndicator` reçoit `null`

**Seuil ±1% :** Absorbe les fluctuations de centimes (ex: 1.800 vs 1.801). Ajustable dans une constante `TREND_THRESHOLD = 0.01`.

### Requête DuckDB multi-fichiers

DuckDB-WASM supporte `read_parquet(['url1', 'url2', ...])` nativement.

```ts
const query = `
  SELECT
    id,
    AVG("Prix Gazole") AS avg_gazole,
    AVG("Prix E10") AS avg_e10,
    AVG("Prix SP95") AS avg_sp95,
    AVG("Prix SP98") AS avg_sp98,
    AVG("Prix E85") AS avg_e85,
    AVG("Prix GPLc") AS avg_gplc
  FROM read_parquet([${urls.map((u) => `'${u}'`).join(', ')}])
  GROUP BY id
`
```

**Accès DuckDB :** Utiliser `useDuckDB()` dans le hook (`import { useDuckDB } from '@/components/DuckDBProvider'`), puis `db.connect()` → `conn.query(sql)` → `conn.close()`.

### Gestion des fichiers manquants

Certains jours peuvent ne pas avoir de fichier consolidé (weekend, panne ETL). DuckDB-WASM lève une erreur si une URL de la liste est absente.

**Stratégie recommandée :** Encapsuler la query dans un `try/catch`. Si elle échoue, retenter en retirant les URLs une par une (ou simplement retourner un résultat vide). Priorité : **ne jamais afficher d'erreur à l'utilisateur**.

Alternative plus robuste : tester chaque URL avec `fetch(..., { method: 'HEAD' })` avant de construire la liste, puis ne passer que les URLs disponibles à DuckDB. Cela évite l'exception DuckDB.

### Clé du store : `${stationId}_${fuelType}`

```ts
// Exemples
buildTrendKey('42501', 'Gazole')  // → '42501_Gazole'
buildTrendKey('75001', 'E10')     // → '75001_E10'
```

Utiliser `buildTrendKey` partout (dans le service ET dans les composants) pour garantir la cohérence.

### Composant `TrendIndicator`

```tsx
'use client'

import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TrendDirection } from '@/lib/priceTrends'

export function TrendIndicator({ direction, className }: { direction: TrendDirection | null; className?: string }) {
  if (!direction) return null
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus
  const color =
    direction === 'up' ? 'text-rose-500' : direction === 'down' ? 'text-emerald-500' : 'text-muted-foreground'
  return <Icon className={cn('size-3', color, className)} />
}
```

**Logique couleur :** hausse = rouge (mauvais pour le portefeuille), baisse = vert (bonne nouvelle pour le conducteur).

### Intégration dans `StationCard`

```tsx
// Dans StationCard.tsx
const priceTrends = useAppStore((s) => s.priceTrends)
const trendKey = buildTrendKey(station.id, selectedFuel as FuelType)
const trendDirection = priceTrends[trendKey] ?? null

// Dans la colonne de droite, sous le prix
{price && <TrendIndicator direction={trendDirection} />}
```

### Intégration dans `PriceCard`

`PriceCard` ne lit pas le store directement — recevoir `trendDirection` en prop depuis `StationDetail` qui lui passe `priceTrends[buildTrendKey(station.id, price.fuel_type)]`.

Alternativement : lire `priceTrends` directement depuis `PriceCard` avec selector. Préférable pour éviter de modifier la signature des props.

```tsx
// Dans PriceCard.tsx
const priceTrends = useAppStore((s) => s.priceTrends)
const trendDirection = priceTrends[buildTrendKey(stationId, price.fuel_type)] ?? null
```

Si on choisit cette option, ajouter `stationId: string` aux props de `PriceCard`.

### Pattern `usePriceTrends`

```ts
'use client'

import { useEffect } from 'react'
import { useDuckDB } from '@/components/DuckDBProvider'
import { useAppStore } from '@/store/useAppStore'
import { fetchPriceTrends } from '@/lib/priceTrends'

export function usePriceTrends() {
  const { db } = useDuckDB()
  const { selectedDepartment, stations, selectedFuel, setPriceTrends } = useAppStore()

  useEffect(() => {
    if (!db || !selectedDepartment || stations.length === 0) return

    let isMounted = true

    fetchPriceTrends(db, stations, selectedDepartment)
      .then((trends) => {
        if (isMounted) setPriceTrends(trends)
      })
      .catch(() => {
        // Fallback silencieux
      })

    return () => { isMounted = false }
  }, [db, selectedDepartment, stations.length]) // Ne pas dépendre de stations (référence instable)
}
```

⚠️ Utiliser `stations.length` comme dépendance (pas `stations`) pour éviter les re-renders infinis — même pattern que d'autres hooks dans ce projet.

### Génération des URLs (getLast7DayUrls)

```ts
const BASE = 'https://huggingface.co/datasets/baptistelechat/fais-ton-plein_dataset/resolve/main/data/consolidated/daily'

export const getLast7DayUrls = (dept: string): string[] => {
  const urls: string[] = []
  const now = new Date()
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    urls.push(`${BASE}/year=${year}/month=${month}/day=${day}/code_departement=${dept}/data_0.parquet`)
  }
  return urls
}
```

### Patterns existants à respecter

- `useDuckDB()` : `src/components/DuckDBProvider.tsx` — renvoie `{ db, isLoading, error }`
- Pattern `useEffect` + `isMounted` : copier le pattern de `FuelDataLoader.tsx`
- `useAppStore((s) => s.field)` : selector pattern — toujours préférer à la déstructuration globale dans les composants
- `useRoadDistances()` dans `DesktopLayout` et `MobileLayout` : modèle de montage d'un hook side-effect global
- `'use client'` : obligatoire sur tous les hooks et composants client

### Anti-patterns à éviter (leçons Epic 2)

- ❌ Ne pas calculer la tendance dans deux endroits différents (`StationCard` ET `PriceCard` séparément) — utiliser exclusivement le store `priceTrends` comme source de vérité
- ❌ Ne pas dériver l'état directement pendant le render — utiliser `useEffect`
- ❌ Ne pas laisser de `console.log` de debug en production
- ❌ Ne pas déclarer des variables/props inutilisées

### Project Structure Notes

**Nouveaux fichiers :**
- `src/lib/priceTrends.ts` — service : types, `buildTrendKey`, `getLast7DayUrls`, `fetchPriceTrends`
- `src/hooks/usePriceTrends.ts` — hook side-effect pour déclencher le chargement
- `src/components/TrendIndicator.tsx` — composant d'affichage de la flèche

**Fichiers modifiés :**
- `src/store/useAppStore.ts` — ajouter `priceTrends` + `setPriceTrends`
- `src/components/StationList/components/StationCard.tsx` — intégrer `TrendIndicator`
- `src/components/StationDetail/components/PriceCard.tsx` — intégrer `TrendIndicator` (+ ajout prop `stationId`)
- `src/components/DesktopLayout.tsx` — monter `usePriceTrends()`
- `src/components/MobileLayout.tsx` — monter `usePriceTrends()`

### References

- Architecture FR-08 : [Source: _bmad-output/plan/solutioning/architecture-faistonplein.md#6.1]
- Store Zustand : [Source: src/store/useAppStore.ts]
- DuckDB Provider : [Source: src/components/DuckDBProvider.tsx]
- FuelDataLoader (pattern isMounted) : [Source: src/components/FuelDataLoader.tsx]
- Consolidation ETL (structure dossier) : [Source: etl/src/consolidate.ts#Daily Consolidation]
- Leçons Epic 2 : [Source: _bmad-output/docs/retrospectives/epic-2-comparaison-economique/retrospective.md]
- useRoadDistances (pattern hook global) : [Source: src/hooks/useRoadDistances.ts]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_Aucun blocage rencontré._

### Completion Notes List

- Implémenté `TrendDirection` + `buildTrendKey` + `getLast7DayUrls` + `fetchPriceTrends` dans `src/lib/priceTrends.ts`
- Stratégie robuste pour les fichiers manquants : test `HEAD` sur chaque URL avant d'appeler DuckDB, évite toute exception DuckDB
- `fetchPriceTrends` calcule les tendances pour TOUS les carburants en une seule requête multi-fichiers
- `usePriceTrends` hook avec `isMounted` pattern et `stations.length` comme dépendance pour éviter les re-renders infinis
- `TrendIndicator` composant simple : `null` → rien affiché, icônes Lucide + couleurs sémantiques (rouge=hausse, vert=baisse)
- `priceTrends` non inclus dans `partialize` → recalculé à chaque session (comportement souhaité)
- `PriceCard` reçoit `stationId` en prop pour construire la clé de tendance sans modifier l'architecture
- Lint : 0 erreur, 0 warning après correction ordre classes Tailwind

### File List

- `src/lib/priceTrends.ts` (nouveau)
- `src/hooks/usePriceTrends.ts` (nouveau)
- `src/components/TrendIndicator.tsx` (nouveau)
- `src/store/useAppStore.ts` (modifié — ajout `priceTrends` + `setPriceTrends`)
- `src/components/StationList/components/StationCard.tsx` (modifié — intégration `TrendIndicator`)
- `src/components/StationDetail/components/PriceCard.tsx` (modifié — intégration `TrendIndicator` + prop `stationId`)
- `src/components/StationDetail/index.tsx` (modifié — passage prop `stationId` à `PriceCard`)
- `src/components/DesktopLayout.tsx` (modifié — montage `usePriceTrends()`)
- `src/components/MobileLayout.tsx` (modifié — montage `usePriceTrends()`)

## Change Log

- 2026-04-01 : Implémentation complète de l'indicateur de tendance — 3 nouveaux fichiers, 6 fichiers modifiés. Flèche ↑↓→ affichée dans `StationCard` et `PriceCard`, calcul AVG 7 jours via DuckDB multi-fichiers Parquet, fallback silencieux si données indisponibles.
