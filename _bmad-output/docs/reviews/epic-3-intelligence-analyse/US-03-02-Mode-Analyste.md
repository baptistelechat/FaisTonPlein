# Code Review — US-03-02 : Mode Analyste

**Date :** 2026-04-07
**Reviewer :** claude-sonnet-4-6 (bmad-code-review)
**Story :** [US-03-02-Mode-Analyste.md](../../stories/epic-3-intelligence-analyse/US-03-02-Mode-Analyste.md)
**Branch :** epic-3
**Statut final :** ✅ done

---

## Résumé de la review

3 layers adversariaux lancés en parallèle : Blind Hunter, Edge Case Hunter, Acceptance Auditor.

| Catégorie | Nombre |
|---|---|
| Decision needed | 3 → tous résolus |
| Patch | 2 → tous appliqués |
| Defer | 2 |
| Dismiss | 4 |

---

## Acceptance Criteria — Conformité

| AC | Titre | Statut |
|---|---|---|
| #1 | Toggle "Mode Analyste" dans `SettingsBody` | ✅ Conforme |
| #2 | `analystMode` persisté (localStorage, défaut `false`) | ✅ Conforme |
| #3 | Mode normal : 4ème colonne = compteur stations | ✅ Conforme |
| #4 | Mode analyste : 4ème colonne = bouton `StationListStats` | ✅ Conforme |
| #5 | `StationListStats` enrichi avec sous-titres par métrique | ✅ Conforme |
| #6 | Bouton "Historique" conditionnel à `analystMode === true`, reste `disabled` | ✅ Conforme |
| #7 | Lint : 0 erreur bloquante | ✅ Conforme |

---

## Décisions prises

**[D1] Scope creep — 9 nouveaux fichiers créés** → **Accepté**

Le spec imposait "Aucun nouveau fichier" mais l'implémentation a créé un dossier `StationListStats/` avec 9 fichiers (`StatsBody`, `StatRow`, `BrandInsightSection`, `BrandPriceChart`, `PriceDistributionChart`, `TrendBar`, `brandExtraction.ts`, `geoStats.ts`, `dispersionLabels.tsx`). Ces fichiers enrichissent la qualité du Mode Analyste au-delà du scope minimal. Décision : accepté, la refacto apporte une valeur réelle à l'app.

**[D2] IQR/Écart-type : labels dynamiques vs strings statiques** → **Accepté**

Le spec demandait des strings statiques fixes. L'implémentation utilise des helpers `getIQRLabel(iqr)` et `getStdDevLabel(stdDev)` avec des labels contextuels colorés selon le niveau de dispersion. Décision : accepté, le dynamisme améliore l'expérience analyste.

**[D3] P90 : description du spec sémantiquement incorrecte** → **Ignoré**

Le spec avait une erreur (`'Seulement 10% des stations sont moins chères'` est la description de P10, pas P90). L'implémentation (`'10% des stations sont plus chères que ce seuil'`) est sémantiquement correcte. Pas de changement nécessaire.

---

## Patches appliqués

**[P1] Promise `getStationNamesDb()` — cleanup d'unmount + `.catch()`**

Fichier : `src/components/StationList/components/StationListStats.tsx:49`

Avant :
```ts
useEffect(() => {
  getStationNamesDb().then((names) => {
    setStationNames(names)
    setNamesLoading(false)
  })
}, [])
```

Après :
```ts
useEffect(() => {
  let cancelled = false
  getStationNamesDb()
    .then((names) => {
      if (!cancelled) {
        setStationNames(names)
        setNamesLoading(false)
      }
    })
    .catch(() => {
      if (!cancelled) setNamesLoading(false)
    })
  return () => {
    cancelled = true
  }
}, [])
```

**[P2] `'use client'` ajouté dans `dispersionLabels.tsx`**

Fichier : `src/components/StationList/components/StationListStats/helpers/dispersionLabels.tsx:1`

Directive ajoutée en ligne 1 pour éviter les erreurs d'hydratation Next.js App Router.

---

## Travaux déférés

Voir [`_bmad-output/docs/deferred-work.md`](../../deferred-work.md) :

- `bodyProps` non mémoïsé dans `StationListStats` (perf, non bloquant)
- Persistance cross-onglets de `analystMode` (limitation Zustand globale au projet)
