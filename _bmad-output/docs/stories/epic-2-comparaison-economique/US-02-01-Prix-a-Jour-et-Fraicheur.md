# US-02-01 : Prix à Jour et Fraîcheur

**ID:** US-02-01
**Epic:** E02 - Comparaison Économique
**Priority:** Must Have
**Story Points:** 3
**Status:** Ready for Dev

## User Story

**En tant que** conducteur,
**Je veux** voir les prix avec une indication de leur fraîcheur,
**Afin de** ne pas me déplacer pour un prix obsolète.

## Acceptance Criteria

- [ ] **Indicateur de fraîcheur par prix** : Chaque `PriceCard` dans le détail station affiche un indicateur coloré basé sur la date de mise à jour du prix concerné.
- [ ] **Code couleur** : Vert si `< 24h`, Orange si entre `24h` et `72h`, Rouge si `> 72h`.
- [ ] **Texte relatif** : L'indicateur affiche le temps écoulé en langage naturel (ex : "Mis à jour il y a 2h", "Mis à jour il y a 3j").
- [ ] **Badge "MAJ" déplacé** : Le badge de date globale (`lastUpdate`) est retiré de la superposition carte (`MobileLayout`, `DesktopLayout`) et repositionné sous le bloc stats de `StationList`, dans le flux naturel de lecture.
- [ ] **Robustesse** : Si la date est absente ou invalide, aucun indicateur n'est affiché.

## Technical Notes

### 1. Source de données — colonnes Parquet dédiées

Le fichier Parquet expose des colonnes individuelles par carburant (contrairement au champ `prix` qui est un JSON agrégé) :

| Colonne                        | Contenu                              |
| ------------------------------ | ------------------------------------ |
| `Prix Gazole`                  | Prix en float                        |
| `Prix Gazole mis à jour le`    | Timestamp de la dernière MAJ du prix |
| `Prix E10`                     | Prix en float                        |
| `Prix E10 mis à jour le`       | Timestamp                            |
| *(idem SP95, SP98, E85, GPLc)* | <br />                               |

**Ces colonnes remplacent le parsing JSON du champ** **`prix`.** Le champ `FuelPrice.updated_at` existait déjà dans le store mais était populé via un `@maj` issu du JSON — jamais utilisé dans l'UI. Cette story le rend enfin fonctionnel en le branchant sur la bonne source.

### 2. Mise à jour de `RawStationData` et du mapper

Dans `src/lib/mappers.ts`, ajouter les colonnes dédiées à `RawStationData` et remplacer le `JSON.parse` de `prix` par une lecture directe des colonnes :

```ts
export interface RawStationData {
  id: string
  latitude: number | bigint
  longitude: number | bigint
  'Code postal': string
  Adresse: string
  Ville: string
  services: string | null
  'Automate 24-24 (oui/non)': string | null
  pop?: string | null
  // Colonnes prix par carburant (remplacent le champ JSON 'prix')
  'Prix Gazole'?: number | null
  'Prix Gazole mis à jour le'?: string | null
  'Prix SP95'?: number | null
  'Prix SP95 mis à jour le'?: string | null
  'Prix E10'?: number | null
  'Prix E10 mis à jour le'?: string | null
  'Prix SP98'?: number | null
  'Prix SP98 mis à jour le'?: string | null
  'Prix E85'?: number | null
  'Prix E85 mis à jour le'?: string | null
  'Prix GPLc'?: number | null
  'Prix GPLc mis à jour le'?: string | null
  [key: string]: unknown
}
```

Remplacer la logique de parsing des prix dans `mapRawDataToStation` :

```ts
// Remplace le bloc JSON.parse de 'raw.prix'
prices = FUEL_TYPES.map((fuel) => {
  const price = raw[`Prix ${fuel.type}`] as number | null | undefined
  const updatedAt = raw[`Prix ${fuel.type} mis à jour le`] as string | null | undefined
  if (price == null || isNaN(price)) return null
  return {
    fuel_type: fuel.type,
    price,
    updated_at: updatedAt ?? '',
  }
}).filter((p): p is FuelPrice => p !== null)
```

> Supprimer le champ `prix: string` de `RawStationData` et tout le bloc `JSON.parse` associé.

### 3. Utilitaire `priceFreshness`

Créer `src/lib/priceFreshness.ts` :

```ts
export type FreshnessLevel = 'fresh' | 'moderate' | 'stale'

export function getPriceFreshness(updatedAt: string): FreshnessLevel {
  const updatedMs = Date.parse(updatedAt.replace(' ', 'T'))
  if (isNaN(updatedMs)) return 'stale'
  const ageHours = (Date.now() - updatedMs) / (1000 * 60 * 60)
  if (ageHours < 24) return 'fresh'
  if (ageHours < 72) return 'moderate'
  return 'stale'
}

export function formatPriceAge(updatedAt: string): string | null {
  const updatedMs = Date.parse(updatedAt.replace(' ', 'T'))
  if (isNaN(updatedMs)) return null
  const ageHours = Math.floor((Date.now() - updatedMs) / (1000 * 60 * 60))
  if (ageHours < 1) return 'Mis à jour il y a < 1h'
  if (ageHours < 24) return `Mis à jour il y a ${ageHours}h`
  const ageDays = Math.floor(ageHours / 24)
  return `Mis à jour il y a ${ageDays}j`
}

export const FRESHNESS_DOT_COLORS: Record<FreshnessLevel, string> = {
  fresh: 'bg-emerald-500',
  moderate: 'bg-amber-500',
  stale: 'bg-rose-500',
}

export const FRESHNESS_TEXT_COLORS: Record<FreshnessLevel, string> = {
  fresh: 'text-emerald-500',
  moderate: 'text-amber-500',
  stale: 'text-rose-500',
}
```

> Le format retourné par `Prix X mis à jour le` est `"YYYY-MM-DD HH:MM:SS"`. Le `.replace(' ', 'T')` est nécessaire pour que `Date.parse` fonctionne correctement sur tous les navigateurs.

### 4. Indicateur dans `PriceCard` (`StationDetail.tsx`)

Ajouter l'indicateur sous la ligne prix dans le composant `PriceCard`. Après le `div` `flex items-baseline` (prix + `€`) :

```tsx
{price.updated_at && (() => {
  const freshness = getPriceFreshness(price.updated_at)
  const label = formatPriceAge(price.updated_at)
  if (!label) return null
  return (
    <div className="mt-1 flex items-center gap-1">
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', FRESHNESS_DOT_COLORS[freshness])} />
      <span className={cn('text-[10px]', FRESHNESS_TEXT_COLORS[freshness])}>{label}</span>
    </div>
  )
})()}
```

> En profiter pour renommer `IStationDetailsProps` → `StationDetailProps` (convention TypeScript idiomatique, cf. retro Epic 1).

### 5. Déplacement du badge "MAJ"

**Retirer** le bloc `{lastUpdate && <Badge>...}` dans `MobileLayout.tsx` et `DesktopLayout.tsx`.

**Ajouter** sous le bloc stats de `StationList/index.tsx` (après la `div` `grid` qui contient Min/Médiane/Max) :

```tsx
// Ajouter lastUpdate depuis useAppStore() en haut du composant
const { ..., lastUpdate } = useAppStore()

// Sous le bloc {currentStats && (...)}
{lastUpdate && (
  <p className="text-muted-foreground flex items-center justify-center gap-1 text-[11px]">
    <Clock className="size-3" />
    MAJ : {format(new Date(lastUpdate), 'd MMM à HH:mm', { locale: fr })}
  </p>
)}
```

Imports à ajouter dans `StationList/index.tsx` : `Clock` (lucide-react), `format` (date-fns), `fr` (date-fns/locale/fr).

Résultat visuel :

```
[ Min. 1.65€   Médiane 1.72€   Max. 1.81€   📊 ]
  🕐 MAJ : 26 mars à 22:00                        ← nouvelle position
```

## Dependencies

- **US-01-03** (Détail d'une Station) : `PriceCard` est défini dans `StationDetail.tsx`.
- **US-01-02** (Liste des Stations) : `StationList/index.tsx` et `StationListStats`.

## Definition of Done

- [ ] `RawStationData` utilise les colonnes `Prix X` et `Prix X mis à jour le` — le champ `prix: string` et son `JSON.parse` sont supprimés.
- [ ] `src/lib/priceFreshness.ts` créé avec `getPriceFreshness`, `formatPriceAge`, et les constantes de couleurs.
- [ ] `PriceCard` affiche un dot coloré + texte relatif sous chaque prix. Si `updated_at` est vide/invalide, aucun indicateur.
- [ ] Badge "MAJ" retiré de `MobileLayout.tsx` et `DesktopLayout.tsx`, ajouté sous les stats dans `StationList/index.tsx`.
- [ ] `rtk lint` sans erreur bloquante.
- [ ] Test visuel : prix récent → dot vert, prix > 3j → dot rouge, `updated_at` vide → pas de dot.

