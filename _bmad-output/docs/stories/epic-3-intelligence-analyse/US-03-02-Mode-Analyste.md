# Story 3.2 : Mode Analyste

**Status:** done

## Story

**En tant que** "Data Nerd",
**Je veux** activer un mode avancé,
**Afin de** visualiser des données supplémentaires sans surcharger l'interface par défaut.

## Acceptance Criteria

1. Un toggle "Mode Analyste" est accessible dans les paramètres (`StationListSettings.tsx` — `SettingsBody`).
2. L'état `analystMode` est persisté dans le store Zustand (localStorage) — valeur par défaut : `false`.
3. En mode normal (défaut) : le bandeau de stats dans `StationList` affiche Min / Médiane / Max + le **nombre de stations** à la place du bouton modal — le bouton `StationListStats` n'est PAS visible.
4. En mode analyste activé : le bandeau de stats dans `StationList` affiche Min / Médiane / Max + **le bouton `StationListStats`** (comportement actuel) qui ouvre le modal/drawer de stats détaillées.
5. `StationListStats.tsx` est enrichi : chaque métrique (Médiane, Moyenne, P10, P25, P75, P90, IQR, Écart-type) dispose d'une ligne de sous-titre explicatif en dessous.
6. En mode analyste activé dans `StationDetail` : le bouton "Historique" (actuellement `disabled={true}` et toujours rendu) n'est rendu que si `analystMode === true`. Il reste `disabled` — US-03-03 l'activera et ajoutera le graphique.
7. Lint : 0 erreur bloquante.

## Tasks / Subtasks

- [x] Task 1 : Ajouter `analystMode` au store (AC: #2)
  - [x] Ajouter `analystMode: boolean` dans le type `AppStore` (valeur initiale : `false`)
  - [x] Ajouter `setAnalystMode: (enabled: boolean) => void`
  - [x] Ajouter `analystMode` dans `partialize` (préférence persistée)
  - [x] Ajouter `analystMode` dans le `merge` custom (valeur par défaut : `false`)

- [x] Task 2 : Toggle "Mode Analyste" dans `SettingsBody` (AC: #1)
  - [x] Ajouter une section "Mode Analyste" en bas de `SettingsBody` (après le bloc "Mes habitudes")
  - [x] Utiliser le pattern `Switch` + `Label` + `Separator` identique aux toggles "Autoroutes" / "Tracé de l'itinéraire"
  - [x] Icône : `FlaskConical` (Lucide) pour le label
  - [x] Lire `analystMode` et appeler `setAnalystMode` depuis le store dans `SettingsBody`

- [x] Task 3 : Bandeau stats dans `StationList` — conditionner la 4ème colonne (AC: #3, #4)
  - [x] Dans `StationList/index.tsx`, lire `analystMode` avec selector
  - [x] 4ème colonne si `analystMode === false` : afficher le nombre de stations (`currentStats.count`) — ex: `"42"` + label `"stations"`
  - [x] 4ème colonne si `analystMode === true` : afficher `<StationListStats statistics={currentStats} />` (comportement actuel)
  - [x] Les 3 premières colonnes (Min / Médiane / Max) et le conteneur du bandeau restent IDENTIQUES dans les deux modes

- [x] Task 4 : Enrichir `StationListStats.tsx` avec des sous-titres explicatifs (AC: #5)
  - [x] Ajouter une prop optionnelle `description?: string` à `StatRow` (et son interface `StatRowProps`)
  - [x] Si `description` est fourni, afficher un `<p>` explicatif sous la ligne label/valeur
  - [x] Passer `description` pour chaque `StatRow` concerné dans `StatsBody`
  - [x] Voir le détail des textes dans les Dev Notes

- [x] Task 5 : Conditionner le bouton "Historique" dans `StationDetail` (AC: #6)
  - [x] Dans `StationDetail/index.tsx`, lire `analystMode` avec selector
  - [x] Conditionner le rendu du bouton "Historique" à `analystMode === true`
  - [x] Ne PAS modifier `disabled={true}` — US-03-03 gérera l'activation

- [x] Task 6 : Lint et validation visuelle (AC: #7)
  - [x] `rtk lint` sans erreur bloquante
  - [x] Test visuel : toggle présent dans les réglages, compteur visible en mode normal, bouton stats visible en mode analyste, sous-titres lisibles dans le modal/drawer

## Dev Notes

### Modification du store (`src/store/useAppStore.ts`)

```ts
// Ajouter dans le type AppStore :
analystMode: boolean;
setAnalystMode: (enabled: boolean) => void;

// Valeur initiale dans create() :
analystMode: false,
setAnalystMode: (analystMode) => set({ analystMode }),

// Dans partialize (ligne ~357) :
analystMode: state.analystMode,

// Dans merge (ligne ~369) :
analystMode: ps.analystMode ?? false,
```

### Toggle dans `SettingsBody` (`StationListSettings.tsx`)

Ajouter en bas de `SettingsBody`, après le bloc `{tankCapacity > 0 && (...)}` et avant la fermeture du `</div>` final :

```tsx
<Separator />
<div className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
  Mode Analyste
</div>
<div className="flex items-center gap-2">
  <Label
    htmlFor="analyst-mode-switch"
    className="flex cursor-pointer items-center gap-1.5"
  >
    <FlaskConical className="size-3.5" />
    Activer le mode analyste
  </Label>
  <Switch
    id="analyst-mode-switch"
    checked={analystMode}
    onCheckedChange={setAnalystMode}
  />
</div>
<p className="text-muted-foreground -mt-2 text-xs">
  Affiche les statistiques avancées et l&apos;historique des prix.
</p>
```

Ajouter `FlaskConical` dans les imports lucide. Ajouter `analystMode`, `setAnalystMode` dans la déstructuration de `useAppStore()` dans `SettingsBody`.

### Bandeau stats dans `StationList/index.tsx`

Seule la 4ème colonne change — le reste du bandeau est identique dans les deux modes.

```tsx
// Ajouter selector (avant le return) :
const analystMode = useAppStore((s) => s.analystMode)

// Remplacer UNIQUEMENT la 4ème colonne du bandeau (lignes ~294-296 actuelles) :
// AVANT :
<StationListStats statistics={currentStats} />

// APRÈS :
{analystMode ? (
  <StationListStats statistics={currentStats} />
) : (
  <div className="flex flex-col items-center">
    <span className="text-xs font-bold">{currentStats.count}</span>
    <span className="text-muted-foreground text-[10px]">stations</span>
  </div>
)}
```

⚠️ Ne toucher qu'à la 4ème colonne. Les 3 colonnes Min / Médiane / Max et les classes du conteneur `grid` restent inchangées.

### Enrichissement de `StatsBody` dans `StationListStats.tsx`

**Refactoriser `StatRow`** pour accepter une prop `description` optionnelle :

```tsx
interface StatRowProps {
  label: string;
  value: string;
  className?: string;
  description?: string;
}

function StatRow({ label, value, className = 'text-slate-600', description }: StatRowProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">{label}</span>
        <span className={`font-mono font-bold ${className}`}>{value}</span>
      </div>
      {description && (
        <p className="text-muted-foreground text-xs">{description}</p>
      )}
    </div>
  );
}
```

Puis passer `description` dans chaque `StatRow` concerné dans `StatsBody` :

| Métrique | `description` |
|---|---|
| Médiane | `'50% des stations proposent un prix inférieur'` |
| Prix moyen | `'Somme des prix ÷ nombre de stations'` |
| P10 | `'90% des stations sont plus chères que ce seuil'` |
| P25 | `'Quartile inférieur — 75% des stations sont plus chères'` |
| P75 | `'Quartile supérieur — 25% des stations sont plus chères'` |
| P90 | `'Seulement 10% des stations sont moins chères'` |
| Écart interquartile (P75 − P25) | `'Fourchette de prix des 50% centraux'` |
| Écart-type | `'Dispersion des prix autour de la moyenne'` |

Les `StatRow` sans `description` (Nombre de stations, Prix minimum, Prix maximum) restent inchangés — la prop est optionnelle.

### Intégration dans `StationDetail/index.tsx`

```tsx
// Ajouter dans la liste des selectors useAppStore (ligne ~32) :
const analystMode = useAppStore((s) => s.analystMode)

// Remplacer le bouton "Historique" (ligne ~176) :
// AVANT :
<Button variant='outline' size='lg' disabled={true} className='w-full'>
  <History className='size-4' />
  Historique
</Button>

// APRÈS :
{analystMode && (
  <Button variant='outline' size='lg' disabled={true} className='w-full'>
    <History className='size-4' />
    Historique
  </Button>
)}
```

### Patterns existants à respecter

- **Selector pattern** : `useAppStore((s) => s.field)` — selector isolé, ne jamais déstructurer tout le store dans un composant
- **`'use client'`** : déjà présent sur tous les fichiers modifiés — rien à ajouter
- **Persistence pattern** : `showHighwayStations`, `showRoute`, `distanceMode` sont dans `partialize` ET dans `merge` avec valeur par défaut — même pattern pour `analystMode`
- **Switch + Label pattern** : copier exactement le pattern des toggles "Autoroutes" / "Tracé de l'itinéraire" (lignes 234–265 de `StationListSettings.tsx`)
- **useAppStore() dans SettingsBody** : `SettingsBody` déstructure déjà `useAppStore()` en une seule ligne — ajouter `analystMode` et `setAnalystMode` dans cette déstructuration existante

### Anti-patterns à éviter

- ❌ Ne pas créer de composant `AnalystStatsPanel` — la variante choisie ne nécessite pas de nouveau composant
- ❌ Ne pas modifier les 3 colonnes Min / Médiane / Max du bandeau ni le layout du conteneur `grid`
- ❌ Ne pas ajouter des `<p>` manuellement après chaque `StatRow` — utiliser la prop `description` du composant refactorisé
- ❌ Ne pas modifier l'état `disabled` du bouton "Historique" — US-03-03 gère l'activation et le graphique
- ❌ Ne pas implémenter le graphique historique (Recharts) — c'est US-03-03
- ❌ Ne pas modifier `useFilteredStats` ni la logique de calcul des `FuelStats`

### Préparation pour US-03-03

US-03-03 (Graphique Historique) :
- Ajoutera un composant Recharts dans `StationDetail`, visible uniquement si `analystMode === true`
- Activera le bouton "Historique" (`disabled={false}`) et affichera le graphique
- Utilisera `analystMode` de cette story comme gate — US-03-03 ne modifiera pas le toggle ni la section Settings

### Structure de fichiers

**Aucun nouveau fichier.**

**Fichiers modifiés :**
- `src/store/useAppStore.ts` — `analystMode` + `setAnalystMode` + `partialize` + `merge`
- `src/components/StationList/components/StationListSettings.tsx` — toggle `Switch` dans `SettingsBody`
- `src/components/StationList/components/StationListStats.tsx` — sous-titres explicatifs dans `StatsBody`
- `src/components/StationList/index.tsx` — selector `analystMode`, 4ème colonne conditionnelle
- `src/components/StationDetail/index.tsx` — rendu conditionnel du bouton "Historique"

### Références

- Store (pattern persistence) : `src/store/useAppStore.ts:356-394`
- Toggle pattern existant : `src/components/StationList/components/StationListSettings.tsx:233-265`
- Bandeau compact (4ème colonne à modifier) : `src/components/StationList/index.tsx:279-299`
- StatsBody (sous-titres à ajouter) : `src/components/StationList/components/StationListStats.tsx:49-93`
- StationDetail (bouton Historique) : `src/components/StationDetail/index.tsx:175-179`
- US-03-01 (patterns hooks/selector/store) : `_bmad-output/docs/stories/epic-3-intelligence-analyse/US-03-01-Indicateur-de-Tendance.md`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

Aucun blocage. Implémentation directe selon les Dev Notes.

### Completion Notes List

- Task 1 : `analystMode: boolean` + `setAnalystMode` ajoutés dans `AppStore`, valeur initiale `false`, persistés via `partialize` + `merge`.
- Task 2 : Section "Mode Analyste" ajoutée en bas de `SettingsBody` avec `FlaskConical`, `Switch`, `Label`, `Separator` — pattern identique aux toggles existants.
- Task 3 : Selector `analystMode` ajouté dans `StationList/index.tsx`. 4ème colonne du bandeau : compteur `currentStats.count` en mode normal, `<StationListStats />` en mode analyste. Les 3 colonnes Min/Médiane/Max inchangées.
- Task 4 : `StatRow` refactorisé avec `description?: string` optionnel. `<p>` affiché si description fournie. Toutes les métriques statistiques (Médiane, Prix moyen, P10, P25, P75, P90, IQR, Écart-type) ont leur description explicative. Nombre de stations, Min, Max restent sans description.
- Task 5 : Bouton "Historique" dans `StationDetail` rendu conditionnel (`analystMode === true`). `disabled={true}` non modifié — US-03-03 le gèrera.
- Task 6 : `pnpm lint` — 0 erreur bloquante.

### File List

- `src/store/useAppStore.ts`
- `src/components/StationList/components/StationListSettings.tsx`
- `src/components/StationList/components/StationListStats.tsx`
- `src/components/StationList/index.tsx`
- `src/components/StationDetail/index.tsx`

### Review Findings

- [x] [Review][Decision] Scope creep — 9 nouveaux fichiers créés (`StationListStats/` subfolder) — **Accepté** : enrichissement souhaité, améliore la qualité du Mode Analyste.
- [x] [Review][Decision] IQR/Écart-type labels dynamiques vs strings statiques — **Accepté** : le dynamisme contextuel améliore l'expérience analyste.
- [x] [Review][Decision] P90 description du spec incorrecte — **Ignoré** : l'impl est sémantiquement correcte, le spec avait une erreur.
- [x] [Review][Patch] Promise `getStationNamesDb()` — cleanup d'unmount + `.catch()` ajoutés. [src/components/StationList/components/StationListStats.tsx:49]
- [x] [Review][Patch] `'use client'` ajouté dans `dispersionLabels.tsx`. [src/components/StationList/components/StationListStats/helpers/dispersionLabels.tsx:1]
- [x] [Review][Defer] `bodyProps` recréé sans `useMemo` — optimisation de performance non bloquante. [src/components/StationList/components/StationListStats.tsx:68-80] — deferred, pre-existing
- [x] [Review][Defer] Persistance cross-onglets de `analystMode` — limitation Zustand globale au projet. — deferred, pre-existing

## Change Log

- 2026-04-07 : Story créée (ready-for-dev) — variante : compteur de stations en mode normal, bouton modal en mode analyste, sous-titres statistiques dans StationListStats
- 2026-04-07 : Implémentation complète (claude-sonnet-4-6) — `analystMode` store + toggle settings + bandeau conditionnel + sous-titres StatsBody + bouton Historique conditionnel. Status → review.
- 2026-04-07 : Code review (claude-sonnet-4-6) — 3 decision_needed, 2 patch, 2 defer, 4 dismiss.
