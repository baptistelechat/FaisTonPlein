# Rétrospective : Epic 1 - Exploration Géographique

**Date :** 26/03/2026
**Facilitateur :** Baptiste (Scrum Master)
**Participants :** Baptiste (Product Manager / Developer)
**Statut :** Terminé

***

## 1. Contexte & Objectifs

**Objectif de l'Epic :** Permettre à l'utilisateur de visualiser et trouver les stations-service autour de lui, avec une carte interactive, une liste triable, le détail complet d'une station et des filtres personnalisés persistants.

### Tâches Réalisées

- [x] **US-01-01 : Carte Interactive** — Carte MapLibre centrée sur la position, marqueurs, clustering
- [x] **US-01-02 : Liste des Stations** — Liste triable par distance/prix avec badges Top 3
- [x] **US-01-03 : Détail d'une Station** — Drawer mobile / Sidebar desktop, grille prix, navigation GPS
- [x] **US-01-04 : Filtre Carburant & Préférences** — Filtre carburant, rayon, toggle autoroutes, persistance `localStorage`

### Scores de Revue par Story

| Story | Architecture | Code Quality | UI/UX | Performance |
| :--- | :---: | :---: | :---: | :---: |
| US-01-01 Carte Interactive | ⚠️ 3/5 | ✅ 4/5 | ⚠️ 3.5/5 | ✅ 4/5 |
| US-01-02 Liste des Stations | ✅ 5/5 | ⚠️ 4.5/5 | ✅ 4/5 | ✅ 5/5 |
| US-01-03 Détail d'une Station | ✅ 5/5 | ✅ 4.5/5 | ✅ 5/5 | ✅ 5/5 |
| US-01-04 Filtres & Préférences | ✅ | ✅ | ✅ | ✅ |

***

## 2. Ce qui s'est bien passé (What went well)

### Architecture & Composants

- **Séparation Mobile / Desktop :** Le pattern `Drawer` (Vaul, mobile) vs `Sheet` (shadcn, desktop) est solide et bien réutilisé entre toutes les stories. L'intégration dans `MobileLayout` et `DesktopLayout` évite toute duplication de logique.
- **Zustand Store Centralisé :** Après correction de la duplication en US-01-01, le store `useAppStore` est devenu le seul point de vérité pour toute l'application. Les stories suivantes ont bénéficié d'une base propre.
- **Hook `useFilteredStations` :** La centralisation du filtrage (carburant → autoroutes → rayon) dans un seul hook en US-01-04 est exemplaire. La carte et la liste consomment exactement la même source de données, éliminant tout risque de désynchronisation.
- **Middleware `persist` Zustand :** L'implémentation de la persistance via `partialize` est propre et robuste, avec validation des valeurs restaurées et fallbacks défensifs.

### UX & Fonctionnalités

- **Navigation GPS Duale :** L'implémentation de deux boutons distincts (Google Maps + Waze) dans US-01-03 est un vrai plus UX.
- **Badges Top 3 :** Le calcul des rangs via `useMemo` et les badges colorés (1, 2, 3) donnent une lisibilité immédiate à la liste.
- **Toggle Autoroutes Intelligent :** Le désactivation automatique du toggle quand aucune station autoroutière n'est dans le rayon (US-01-04) est une UX subtile et bien pensée.
- **Vue Adaptative Détail Station :** Le mode MEDIUM (snap partiel) → carburant sélectionné uniquement / mode EXPANDED → grille complète est une excellente décision d'ergonomie mobile.

### Performance

- **Usage systématique de `useMemo` :** Tri, calcul des rangs, filtrage — tous mémoïsés avec des dépendances correctes. Aucun recalcul inutile détecté.
- **Stats centralisées dans le store :** Les statistiques (Min, Médiane, Max) calculées une seule fois dans `setStations` et accessibles partout sans re-calcul.

***

## 3. Ce qui a été difficile (What didn't go well)

### Dead Code & Code Commenté

- **Store dupliqué en US-01-01 :** `useStationStore.ts` coexistait avec `useAppStore.ts` et dupliquait les types `Station` et `FuelPrice`. Ce vestige de prototypage aurait dû être supprimé avant la review.
- **Badges Top 3 commentés en US-01-02 :** Le code correspondant à un critère d'acceptance explicite était commenté et incomplet lors de la review. La variable `rank` n'était pas propagée jusqu'au composant. Cela traduit un critère non terminé présenté comme "done".
- **Dead code dans le store en US-01-03 :** Deux variables (`updatedAtMs`, `stationIds`) alimentées dans la boucle `setStations` mais jamais utilisées ni exposées — résidu d'une itération de design abandonnée.
- **Alias inutile en US-01-04 :** `stationsWithFuel` dans `StationList/index.tsx`, vestige de l'ancien filtrage inline, subsistait sans utilité après refactoring.

### Qualité & Conventions TypeScript

- **Nommage d'interface non idiomatique :** Le préfixe `I` sur `IStationPrice` (convention C#/Java) dans `StationDetail.tsx` est anti-pattern TypeScript. La convention du projet doit être rappelée en début de story.
- **Closure inutile `inferStationName` :** Définie comme closure dans `mapRawDataToStation` mais sans capturer aucune variable du scope. Complexité artificielle.
- **`key` React redondant :** Attribut `key` sur le `div` racine interne d'un composant — erreur subtile mais révélatrice d'une incompréhension du fonctionnement de React.

### Animations & Interactions

- **Conflit d'animation en US-01-01 :** Les classes `animate-in slide-in-from-bottom` sur `StationDetailSheet` se superposaient aux animations natives de `SheetContent` et `Drawer.Content`, créant un effet de double-slide. Ce type de conflit est difficile à détecter sans test visuel réel.

***

## 4. Actions & Améliorations (Action Items)

### Pour l'Epic 2 (Comparaison Économique)

- [ ] **Définition of Done renforcée :** Avant toute review, vérifier explicitement que **tous** les critères d'acceptance sont fonctionnels et non commentés. "Done" = le code tourne, pas "le code est écrit".
- [ ] **Nettoyage préventif :** Supprimer le dead code et les variables non utilisées dès la fin du développement d'une story, pas lors de la review. Utiliser `rtk lint` régulièrement pour détecter les unused vars.
- [ ] **Convention TypeScript :** Toujours nommer les interfaces de props `{ComponentName}Props` (ex: `StationDetailProps`), sans préfixe `I`, pour rester idiomatique TypeScript.
- [ ] **Test visuel des animations :** Pour tout nouveau composant utilisant un `Sheet`, `Drawer` ou toute animation d'entrée, vérifier visuellement qu'il n'y a pas de double-animation avant de considérer la story terminée.

### Pour le Futur

- **Monitoring ETL :** L'action item de l'Epic 0 sur la mise en place d'alertes ETL reste ouverte — à adresser avant l'Epic 3 (Intelligence & Analyse) qui dépend de données historiques fiables.
- **Accessibilité :** Les patterns `Label htmlFor` + `Switch id` introduits en US-01-04 sont bons. Les appliquer systématiquement aux prochains composants de formulaire.

***

## 5. Conclusion

L'Epic 1 est un succès fonctionnel complet. Les 4 user stories ont été livrées et validées. L'expérience utilisateur mobile/desktop est cohérente, performante et les filtres sont persistants.

La principale leçon de cet epic est la **gestion du code de transition** : les vestiges de prototypage (stores, variables, aliases) s'accumulent silencieusement et ne remontent qu'en review. L'Epic 2 démarrera avec une codebase plus propre et une discipline plus stricte sur la définition de "done".

L'application est prête pour passer à la **Comparaison Économique** (Epic 2) : indicateurs de fraîcheur des prix, calcul du coût du plein, et tri intelligent prix/distance.
