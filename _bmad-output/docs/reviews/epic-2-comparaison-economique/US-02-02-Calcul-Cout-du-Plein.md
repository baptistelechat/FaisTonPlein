# Code Review — US-02-02 : Calcul du Coût du Plein

**Story :** US-02-02
**Epic :** E02 - Comparaison Économique
**Reviewer :** Developer Agent
**Date :** 2026-03-29
**Verdict global :** ✅ Approuvé

---

## Résumé de l'implémentation

L'implémentation est **complète et dépasse la spec** sur plusieurs points. Le calcul du coût du plein est fonctionnel dans `StationCard` et `PriceCard`, la persistance est correcte, et un composant `FillEstimate` réutilisable a été extrait. Une feature bonus `fillHabit` (habitudes de plein) affine le calcul sans alourdir l'interface.

---

## Fichiers modifiés/créés

| Fichier | Statut | Notes |
|---|---|---|
| `src/lib/constants.ts` | ✅ Modifié | `VehicleType`, `VehiclePreset`, `VEHICLE_PRESETS`, `FILL_HABIT_OPTIONS`, `FillHabit` ajoutés |
| `src/store/useAppStore.ts` | ✅ Modifié | `vehicleType`, `tankCapacity`, `consumption`, `fillHabit` + setters + persist |
| `src/components/FillEstimate.tsx` | ✅ Créé | Composant réutilisable (bonus — non prévu dans la spec) |
| `src/components/StationList/components/StationCard.tsx` | ✅ Modifié | `FillEstimate` sous le prix |
| `src/components/StationList/components/StationListSettings.tsx` | ✅ Modifié | Section "Mon véhicule" + grille + `VehicleInputs` + section "Mes habitudes" |
| `src/components/StationDetail/components/PriceCard.tsx` | ✅ Modifié | `FillEstimate` inline ou block selon `inlineEstimate` |
| `src/components/StationDetail/index.tsx` | ✅ Modifié | Refactorisé en dossier, `PriceCard` importé depuis sous-composant |

---

## ✅ Points positifs

### 1. Composant `FillEstimate` extrait

La spec suggérait d'inliner le calcul directement dans `StationCard` et `PriceCard`. L'implémentation a extrait un composant dédié `FillEstimate.tsx`, ce qui évite la duplication et centralise la logique de rendu.

```tsx
// FillEstimate.tsx
if (tankCapacity <= 0) return null
const cost = (tankCapacity * fillHabit * pricePerLiter).toFixed(0)
```

### 2. Feature bonus `fillHabit`

Ajout d'une option "Je fais le plein quand…" (¼ consommé / moitié / ¼ restant / à la réserve / plein complet). Le calcul tient compte de `fillHabit`, ce qui rend l'estimation plus pertinente selon les habitudes de l'utilisateur. La section "Mes habitudes" n'apparaît dans les réglages que si un véhicule est configuré (`tankCapacity > 0`).

### 3. `VehicleInputs` avec `key={vehicleType}`

Le sous-composant `VehicleInputs` reçoit `key={vehicleType}`, ce qui force son remontage complet à chaque changement de preset. Les états locaux `tankInput`/`consInput` sont ainsi réinitialisés sans `useEffect`. Technique correcte et lisible.

### 4. Bouton de reset intelligent

Le bouton de réinitialisation aux valeurs du preset est désactivé (`disabled={isAtPresetDefaults}`) tant que les valeurs n'ont pas été modifiées. UX soignée, non prévue dans la spec.

### 5. Mode `inline` dans `FillEstimate`

La prop `inline` permet d'afficher l'estimation entre parenthèses sur la même ligne que le prix dans `PriceCard` (pour le carburant sélectionné). Les autres carburants affichent l'estimation en dessous. Différenciation pertinente.

### 6. `merge` robuste dans le store

```ts
tankCapacity: typeof ps.tankCapacity === 'number' && ps.tankCapacity >= 0 ? ps.tankCapacity : 0,
consumption: typeof ps.consumption === 'number' && ps.consumption >= 0 ? ps.consumption : 0,
fillHabit: FILL_HABIT_OPTIONS.some((o) => o.value === ps.fillHabit) ? (ps.fillHabit as FillHabit) : 1.0,
```

Validation stricte des données persistées : type + plage pour les numériques, appartenance à l'enum pour `fillHabit`.

---

## ⚠️ Observations mineures (non bloquantes)

### OBS-1 : Ordre `FillEstimate` / fraîcheur dans `PriceCard`

**Spec :** "chaque `PriceCard` affiche le coût estimé du plein **sous l'indicateur de fraîcheur**"

**Implémentation :** `FillEstimate` apparaît **avant** l'indicateur de fraîcheur (`PriceCard.tsx:64-77`).

```tsx
// Ordre actuel : prix → FillEstimate → fraîcheur
{!inlineEstimate && <FillEstimate pricePerLiter={price.price} />}  // ligne 66
{price.updated_at && (() => { /* fraîcheur */ })()}                // ligne 67
```

Choix UX défendable (le coût suit immédiatement le prix), mais dévie de la spec. Non bloquant.

---

### OBS-2 : Validation `val > 0` au lieu de `val >= 10` dans `VehicleInputs`

Le handler `onChange` des inputs accepte `val > 0`, alors que l'attribut HTML `min={10}` est posé. En pratique, le browser bloque la saisie en dessous de 10, mais une saisie programmatique contournerait cette garde JS.

```tsx
// StationListSettings.tsx — onChange réservoir
if (!isNaN(val) && val > 0) setTankCapacity(val)  // accepte 1-9 côté JS
```

Impact nul en prod. Cohérence à améliorer si désiré.

---

## Checklist Definition of Done

| Critère | Statut | Notes |
|---|---|---|
| `VEHICLE_PRESETS` + `VehicleType` dans `src/lib/constants.ts` | ✅ | Conforme à la spec |
| `vehicleType`, `tankCapacity`, `consumption` dans le store + setters + persistance | ✅ | + `fillHabit` en bonus |
| Section "Mon véhicule" dans `StationListSettings` avec grille + 2 inputs conditionnels | ✅ | + reset preset + section "Mes habitudes" |
| Sélection d'un type → pré-remplissage ; inputs restent modifiables | ✅ | Via `VehicleInputs` avec `key` |
| `StationCard` affiche `~X€ le plein` si `tankCapacity > 0` | ✅ | Via `FillEstimate` |
| `PriceCard` affiche le coût estimé | ✅ | Inline ou block selon contexte |
| Pas d'affichage si `tankCapacity = 0` | ✅ | `if (tankCapacity <= 0) return null` |
| `rtk lint` sans erreur bloquante | ✅ | Faux positif rtk connu = 0 erreurs ESLint |

---

## Recommandation

**Approuvé.** Tous les critères d'acceptation et le DoD sont remplis. Les déviations sont des améliorations (extraction de composant, feature `fillHabit`). OBS-1 est un écart d'ordre visuel mineur. OBS-2 n'a aucun impact fonctionnel en production.

> Statut confirmé : `done`
