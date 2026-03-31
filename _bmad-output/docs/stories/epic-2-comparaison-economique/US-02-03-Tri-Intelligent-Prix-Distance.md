# US-02-03 : Tri Intelligent (Prix + Distance)

**ID:** US-02-03
**Epic:** E02 - Comparaison Économique
**Priority:** Should Have
**Story Points:** 3
**Status:** Ready for Dev

## User Story

**En tant que** conducteur pragmatique,
**Je veux** trier les stations par "coût réel" incluant la distance pour y aller,
**Afin de** savoir si l'économie vaut le déplacement.

## Acceptance Criteria

- [ ] **Badge "Coût réel" conditionnel** : Dans le header de `StationList`, le badge `Coût réel` n'est visible que si un véhicule est configuré (`consumption > 0` et `tankCapacity > 0`) ET `referenceLocation` est disponible.
- [ ] **Formule** : `effectiveCost = price × fillAmount + price × distance × (consumption / 100)` — où `fillAmount = tankCapacity × fillHabit`.
  - Décomposé : **coût du plein** + **coût du carburant consommé pour rejoindre la station**.
  - La distance utilisée est à vol d'oiseau (Haversine). Limitation assumée : améliorée dans US-02-04.
- [ ] **Tri actif** : Lorsque `listSortBy === "real-cost"`, la liste est triée par `effectiveCost` croissant. En cas d'égalité : tri secondaire par distance.
- [ ] **Surcoût du trajet dans `StationCard`** : Quand `listSortBy === "real-cost"`, afficher sous l'estimation de plein la ligne `+X.XX€ trajet` (coût du carburant pour aller à la station).
- [ ] **Retour automatique** : Si l'utilisateur était en mode "Coût réel" et supprime son véhicule (`setVehicleType(null)`), `listSortBy` repasse automatiquement à `"distance"`.
- [ ] **Persistance** : `listSortBy` est déjà persisté — aucune modification du `partialize`. Au démarrage, si `"real-cost"` est restauré mais que le véhicule n'est plus configuré, on remet `"distance"` (géré dans le `merge`).

## Technical Notes

### 1. Nouveau helper dans `src/lib/utils.ts`

```ts
export function calculateEffectiveCost(params: {
  pricePerLiter: number
  distanceKm: number
  fillAmount: number    // tankCapacity × fillHabit (litres)
  consumption: number  // L/100km
}): { fillCost: number; travelCost: number; total: number } {
  const { pricePerLiter, distanceKm, fillAmount, consumption } = params
  const fillCost = pricePerLiter * fillAmount
  const travelCost = pricePerLiter * distanceKm * (consumption / 100)
  return { fillCost, travelCost, total: fillCost + travelCost }
}
```

> **Note :** On ne multiplie pas la distance par 2 — on ne sait pas si c'est un aller-retour ou si la station est sur la route. On modélise le coût de trajet pour **rejoindre** la station. C'est une approximation honnête améliorée dans US-02-04 (distances routières réelles).

---

### 2. Mise à jour du type `listSortBy` dans `src/store/useAppStore.ts`

```ts
// Avant
listSortBy: 'price' | 'distance'
setListSortBy: (sortBy: 'price' | 'distance') => void

// Après
listSortBy: 'price' | 'distance' | 'real-cost'
setListSortBy: (sortBy: 'price' | 'distance' | 'real-cost') => void
```

Dans `setVehicleType`, ajouter le reset du tri quand on efface le véhicule :

```ts
setVehicleType: (type) => {
  if (type === null) {
    const currentSort = get().listSortBy
    set({
      vehicleType: null,
      tankCapacity: 0,
      consumption: 0,
      listSortBy: currentSort === 'real-cost' ? 'distance' : currentSort,
    })
    return
  }
  // ... reste inchangé
},
```

Dans le `merge`, valider `listSortBy` restauré :

```ts
merge: (persistedState, currentState) => {
  const ps = persistedState as Partial<AppStore>
  const vehicleOk =
    typeof ps.consumption === 'number' && ps.consumption > 0 &&
    typeof ps.tankCapacity === 'number' && ps.tankCapacity > 0
  const restoredSort =
    ps.listSortBy === 'real-cost' && !vehicleOk ? 'distance' : (ps.listSortBy ?? 'distance')
  return {
    ...currentState,
    // ... autres champs existants ...
    listSortBy: restoredSort,
  }
}
```

---

### 3. Mise à jour de `StationList/index.tsx`

#### 3a. Imports et extraction du store

```ts
const { ..., consumption, tankCapacity, fillHabit } = useAppStore()
```

```ts
import { calculateEffectiveCost } from '@/lib/utils'
import { TrendingDown } from 'lucide-react'
```

```ts
const canUseRealCost = consumption > 0 && tankCapacity > 0 && referenceLocation !== null
```

#### 3b. Logique de tri (remplacer le `useMemo` `sortedStations`)

```ts
const sortedStations = useMemo(() => {
  if (!referenceLocation) return filteredStations

  const fillAmount = tankCapacity * fillHabit

  return [...filteredStations].sort((a, b) => {
    const priceA = a.prices.find((p) => p.fuel_type === selectedFuel)?.price
    const priceB = b.prices.find((p) => p.fuel_type === selectedFuel)?.price

    const distA =
      Math.round(
        calculateDistance(referenceLocation[1], referenceLocation[0], a.lat, a.lon) * 10,
      ) / 10
    const distB =
      Math.round(
        calculateDistance(referenceLocation[1], referenceLocation[0], b.lat, b.lon) * 10,
      ) / 10

    if (listSortBy === 'real-cost') {
      if (!priceA) return 1
      if (!priceB) return -1
      const costA = calculateEffectiveCost({
        pricePerLiter: priceA,
        distanceKm: distA,
        fillAmount,
        consumption,
      }).total
      const costB = calculateEffectiveCost({
        pricePerLiter: priceB,
        distanceKm: distB,
        fillAmount,
        consumption,
      }).total
      const diff = costA - costB
      if (diff !== 0) return diff
      return distA - distB
    }

    if (listSortBy === 'price') {
      if (!priceA) return 1
      if (!priceB) return -1
      const priceDiff = priceA - priceB
      if (priceDiff !== 0) return priceDiff
      return distA - distB
    }

    // distance (default)
    const distDiff = distA - distB
    if (distDiff !== 0) return distDiff
    if (!priceA) return 1
    if (!priceB) return -1
    return priceA - priceB
  })
}, [filteredStations, referenceLocation, selectedFuel, listSortBy, consumption, tankCapacity, fillHabit])
```

#### 3c. Header — badge "Coût réel" conditionnel

```tsx
<h2 className='text-lg font-bold'>
  {listSortBy === 'price'
    ? 'Les plus économiques'
    : listSortBy === 'real-cost'
      ? 'Meilleur rapport coût/trajet'
      : 'Autour de moi'}
</h2>
<div className='flex gap-2'>
  <Badge
    variant={listSortBy === 'distance' ? 'default' : 'outline'}
    className='cursor-pointer'
    onClick={() => setListSortBy('distance')}
  >
    <Route className='size-4' />
    Distance
  </Badge>
  <Badge
    variant={listSortBy === 'price' ? 'default' : 'outline'}
    className='cursor-pointer'
    onClick={() => setListSortBy('price')}
  >
    <Euro className='size-4' />
    Prix
  </Badge>
  {canUseRealCost && (
    <Badge
      variant={listSortBy === 'real-cost' ? 'default' : 'outline'}
      className='cursor-pointer'
      onClick={() => setListSortBy('real-cost')}
    >
      <TrendingDown className='size-4' />
      Coût réel
    </Badge>
  )}
</div>
```

---

### 4. Mise à jour de `StationCard.tsx` — affichage du coût de trajet

Ajouter `listSortBy` dans `StationCardProps` :

```ts
listSortBy: 'price' | 'distance' | 'real-cost'
```

Passer la prop depuis `StationList/index.tsx` :

```tsx
<StationCard ... listSortBy={listSortBy} />
```

Dans `StationCard`, calculer le coût de trajet :

```ts
const consumption = useAppStore((s) => s.consumption)
const tankCapacity = useAppStore((s) => s.tankCapacity)
const fillHabit = useAppStore((s) => s.fillHabit)

const travelCost =
  listSortBy === 'real-cost' && price && distance !== null
    ? calculateEffectiveCost({
        pricePerLiter: price.price,
        distanceKm: distance,
        fillAmount: tankCapacity * fillHabit,
        consumption,
      }).travelCost
    : null
```

Dans le JSX, sous `<FillEstimate>` :

```tsx
{travelCost !== null && (
  <span className='text-muted-foreground text-[10px] font-medium'>
    +{travelCost.toFixed(2)}€ trajet
  </span>
)}
```

---

## Dependencies

- **US-02-02** : `consumption`, `tankCapacity`, `fillHabit` dans le store, `FillEstimate` dans `StationCard`.

## Definition of Done

- [ ] `calculateEffectiveCost()` ajoutée dans `src/lib/utils.ts`.
- [ ] Type `listSortBy` étendu à `"real-cost"` dans le store.
- [ ] `setVehicleType(null)` remet `listSortBy` à `"distance"` si tri courant = `"real-cost"`.
- [ ] `merge` remet `listSortBy` à `"distance"` si `"real-cost"` restauré sans véhicule configuré.
- [ ] Badge "Coût réel" visible uniquement si `consumption > 0`, `tankCapacity > 0`, `referenceLocation !== null`.
- [ ] Tri par `effectiveCost` actif quand `listSortBy === "real-cost"`.
- [ ] `StationCard` affiche `+X.XX€ trajet` quand `listSortBy === "real-cost"`.
- [ ] `rtk lint` sans erreur bloquante.
- [ ] Test visuel : configurer "Berline" (50L, 6.5L/100km), `fillHabit = 0.25` (12.5L à remplir) → activer "Coût réel" → une station à 1 km à 1.90€ (coût réel ≈ 23.81€) doit passer devant une station à 20 km à 1.75€ (coût réel ≈ 24.15€).
