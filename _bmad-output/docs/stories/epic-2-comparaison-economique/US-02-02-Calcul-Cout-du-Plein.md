# US-02-02 : Calcul du Coût du Plein

**ID:** US-02-02
**Epic:** E02 - Comparaison Économique
**Priority:** Should Have
**Story Points:** 5
**Status:** Ready for Dev

## User Story

**En tant que** conducteur économe,
**Je veux** configurer mon type de véhicule, ma capacité de réservoir et ma consommation,
**Afin de** voir le coût total estimé du plein directement sur chaque station plutôt que le seul prix au litre.

## Acceptance Criteria

- [ ] **Sélecteur de type de véhicule** : Dans `StationListSettings`, une section "Mon véhicule" affiche une grille de types. Chaque type présente une icône, un libellé et des exemples de modèles courants.
- [ ] **Pré-remplissage automatique** : Sélectionner un type pré-remplit les champs réservoir et consommation avec les valeurs par défaut du preset.
- [ ] **Inputs modifiables** : Les champs réservoir (L) et consommation (L/100km) restent éditables manuellement après sélection du type.
- [ ] **Persistance** : Le type sélectionné, la capacité et la consommation sont sauvegardés dans le store Zustand (persist).
- [ ] **Affichage dans `StationCard`** : Sous le prix au litre, affiche `~X€ le plein` lorsque `tankCapacity > 0`.
- [ ] **Affichage dans `PriceCard`** : Dans le détail station, chaque `PriceCard` affiche le coût estimé du plein sous l'indicateur de fraîcheur.
- [ ] **Robustesse** : Si `tankCapacity` est 0 ou invalide, aucun coût estimé n'est affiché.

## Technical Notes

### 1. Presets dans `src/lib/constants.ts`

Ajouter les types de véhicules et leurs valeurs par défaut :

```ts
export type VehicleType =
  | 'citadine'
  | 'berline'
  | 'berline_exec'
  | 'suv_compact'
  | 'suv'
  | 'grand_suv'
  | 'monospace'
  | 'utilitaire'
  | 'hybride'
  | 'phev'

export type VehiclePreset = {
  type: VehicleType
  label: string
  examples: string       // affiché sous le label dans le sélecteur
  icon: string           // nom de l'icône Lucide
  tankCapacity: number   // litres
  consumption: number    // L/100km
}

export const VEHICLE_PRESETS: VehiclePreset[] = [
  {
    type: 'citadine',
    label: 'Citadine',
    examples: 'Clio, 208, Yaris, Sandero',
    icon: 'Car',
    tankCapacity: 45,
    consumption: 5.5,
  },
  {
    type: 'berline',
    label: 'Berline / Break',
    examples: 'Golf, Mégane, 308, Focus',
    icon: 'CarFront',
    tankCapacity: 50,
    consumption: 6.5,
  },
  {
    type: 'berline_exec',
    label: 'Grande berline',
    examples: '508, Passat, Série 3, Classe C',
    icon: 'CarFront',
    tankCapacity: 60,
    consumption: 7.0,
  },
  {
    type: 'suv_compact',
    label: 'SUV compact',
    examples: 'Captur, 2008, T-Roc, Puma',
    icon: 'Truck',
    tankCapacity: 45,
    consumption: 6.5,
  },
  {
    type: 'suv',
    label: 'SUV',
    examples: 'Tiguan, 3008, Kadjar, Tucson',
    icon: 'Truck',
    tankCapacity: 55,
    consumption: 7.5,
  },
  {
    type: 'grand_suv',
    label: '4x4 / Grand SUV',
    examples: 'Kodiaq, 5008, Discovery, X5',
    icon: 'Truck',
    tankCapacity: 65,
    consumption: 9.0,
  },
  {
    type: 'monospace',
    label: 'Monospace',
    examples: 'Scenic, Touran, Espace, Zafira',
    icon: 'Bus',
    tankCapacity: 60,
    consumption: 7.0,
  },
  {
    type: 'utilitaire',
    label: 'Utilitaire',
    examples: 'Kangoo, Berlingo, Partner, Transit',
    icon: 'Package',
    tankCapacity: 50,
    consumption: 7.5,
  },
  {
    type: 'hybride',
    label: 'Hybride',
    examples: 'Yaris HEV, Captur E-Tech, Niro HEV',
    icon: 'Zap',
    tankCapacity: 40,
    consumption: 4.5,
  },
  {
    type: 'phev',
    label: 'Hybride rechargeable',
    examples: '3008 PHEV, Captur PHEV, Outlander',
    icon: 'ZapOff',
    tankCapacity: 40,
    consumption: 5.0,
  },
]
```

---

### 2. Mise à jour du store (`src/store/useAppStore.ts`)

Ajouter dans `AppStore` :

```ts
vehicleType: VehicleType | null
tankCapacity: number        // litres
consumption: number         // L/100km (réutilisé dans US-02-03)

setVehicleType: (type: VehicleType | null) => void
setTankCapacity: (capacity: number) => void
setConsumption: (consumption: number) => void
```

Initialisation dans `create` :

```ts
vehicleType: null,
tankCapacity: 0,
consumption: 0,
setVehicleType: (type) => {
  if (type === null) {
    set({ vehicleType: null, tankCapacity: 0, consumption: 0 })
    return
  }
  const preset = VEHICLE_PRESETS.find((p) => p.type === type)
  if (!preset) return
  set({ vehicleType: type, tankCapacity: preset.tankCapacity, consumption: preset.consumption })
},
setTankCapacity: (tankCapacity) => set({ tankCapacity }),
setConsumption: (consumption) => set({ consumption }),
```

Ajouter dans `partialize` :

```ts
partialize: (state) => ({
  selectedFuel: state.selectedFuel,
  searchRadius: state.searchRadius,
  showHighwayStations: state.showHighwayStations,
  vehicleType: state.vehicleType,     // ← nouveau
  tankCapacity: state.tankCapacity,   // ← nouveau
  consumption: state.consumption,     // ← nouveau
}),
```

Ajouter dans `merge` :

```ts
vehicleType: ps.vehicleType ?? null,
tankCapacity: typeof ps.tankCapacity === 'number' && ps.tankCapacity >= 0 ? ps.tankCapacity : 0,
consumption: typeof ps.consumption === 'number' && ps.consumption >= 0 ? ps.consumption : 0,
```

---

### 3. Section "Mon véhicule" dans `StationListSettings.tsx`

Ajouter après la section "Affichage" (à la fin du Dialog) :

```tsx
<Separator />
<div className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
  Mon véhicule
</div>

{/* Grille de types */}
<div className="grid grid-cols-2 gap-1.5">
  {VEHICLE_PRESETS.map((preset) => {
    const Icon = icons[preset.icon]  // voir note sur l'import dynamique ci-dessous
    const isSelected = vehicleType === preset.type
    return (
      <button
        key={preset.type}
        onClick={() => setVehicleType(isSelected ? null : preset.type)}
        className={cn(
          'flex flex-col items-start gap-0.5 rounded-lg border p-2 text-left text-xs transition-all',
          isSelected
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground',
        )}
      >
        <div className="flex items-center gap-1.5 font-semibold">
          <Icon className="size-3.5 shrink-0" />
          {preset.label}
        </div>
        <span className="text-[10px] opacity-70 leading-tight">{preset.examples}</span>
      </button>
    )
  })}
</div>

{/* Inputs réservoir + consommation */}
{vehicleType && (
  <div className="flex flex-col gap-3">
    <div className="flex items-center gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="tank-capacity" className="text-xs">Réservoir (L)</Label>
        <Input
          id="tank-capacity"
          type="number"
          min={10}
          max={150}
          step={1}
          value={tankCapacity}
          onChange={(e) => {
            const val = parseFloat(e.target.value)
            if (!isNaN(val) && val >= 10 && val <= 150) setTankCapacity(val)
          }}
          className="w-24"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="consumption" className="text-xs">Conso (L/100km)</Label>
        <Input
          id="consumption"
          type="number"
          min={1}
          max={25}
          step={0.1}
          value={consumption}
          onChange={(e) => {
            const val = parseFloat(e.target.value)
            if (!isNaN(val) && val >= 1 && val <= 25) setConsumption(val)
          }}
          className="w-24"
        />
      </div>
    </div>
  </div>
)}
```

**Import des icônes Lucide :** Plutôt qu'un import dynamique complexe, déclarer un mapping statique en haut du composant :

```ts
import { Bus, Car, CarFront, Package, Truck, Zap, ZapOff } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const VEHICLE_ICONS: Record<string, LucideIcon> = {
  Car, CarFront, Truck, Bus, Package, Zap, ZapOff,
}
```

Puis utiliser `const Icon = VEHICLE_ICONS[preset.icon]` dans le `.map()`.

Nouvelles valeurs extraites de `useAppStore()` dans ce composant :

```ts
const {
  // ... existants ...
  vehicleType, setVehicleType,
  tankCapacity, setTankCapacity,
  consumption, setConsumption,
} = useAppStore()
```

Imports supplémentaires : `Input` depuis `@/components/ui/input`.

---

### 4. Coût estimé dans `StationCard.tsx`

Convertir la colonne droite (prix) de `div.flex.justify-end` en `div.flex.flex-col.items-end` pour empiler le prix et l'estimation :

```tsx
<div className="flex flex-col items-end">
  {price ? (
    <span className={cn('font-mono text-lg leading-none font-bold', priceColor)}>
      {price.price.toFixed(3)}
      <span className="text-muted-foreground ml-0.5 text-xs font-normal">€</span>
    </span>
  ) : (
    <span className="text-muted-foreground text-xs">-</span>
  )}
  {tankCapacity > 0 && price && (
    <span className="text-muted-foreground text-[10px] font-medium">
      ~{(tankCapacity * price.price).toFixed(0)}€ le plein
    </span>
  )}
</div>
```

`tankCapacity` récupéré via `useAppStore((s) => s.tankCapacity)` dans `StationCard`.

---

### 5. Coût estimé dans `PriceCard` (`StationDetail.tsx`)

Après le bloc fraîcheur, ajouter :

```tsx
{tankCapacity > 0 && (
  <div className="mt-2 border-t border-border/40 pt-2 text-center">
    <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
      Plein estimé
    </span>
    <p className={cn('font-mono text-lg font-extrabold leading-tight', priceColor)}>
      {(tankCapacity * price.price).toFixed(0)}€
    </p>
  </div>
)}
```

`tankCapacity` récupéré via `useAppStore((s) => s.tankCapacity)` dans `PriceCard`.

---

### Note sur `consumption`

Le champ `consumption` est collecté ici mais son usage dans l'UI est réservé à **US-02-03** (tri intelligent prix + distance). Il n'est pas affiché dans cette story — le stocker dès maintenant évite une modification du store lors de la prochaine story.

---

## Dependencies

- **US-02-01** (Prix à Jour et Fraîcheur) : `PriceCard` et `StationCard` déjà implémentés.

## Definition of Done

- [ ] `VEHICLE_PRESETS` + type `VehicleType` ajoutés dans `src/lib/constants.ts`.
- [ ] `vehicleType`, `tankCapacity`, `consumption` ajoutés dans le store avec setters et persistance.
- [ ] Section "Mon véhicule" visible dans `StationListSettings` avec grille de types + 2 inputs conditionnels.
- [ ] Sélectionner un type pré-remplit les inputs ; les inputs restent modifiables indépendamment.
- [ ] `StationCard` affiche `~X€ le plein` sous le prix lorsque `tankCapacity > 0`.
- [ ] `PriceCard` affiche le coût estimé du plein sous l'indicateur de fraîcheur.
- [ ] Si aucun type sélectionné ou `tankCapacity = 0`, aucun coût estimé n'est affiché.
- [ ] `rtk lint` sans erreur bloquante.
- [ ] Test visuel : sélectionner "Hybride" → réservoir=40, conso=4.5 pré-remplis → modifier réservoir à 38 → coût recalculé. Prix E10 à 1.800€ → `~68€ le plein`.
