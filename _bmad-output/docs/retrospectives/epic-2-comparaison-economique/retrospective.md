# Rétrospective : Epic 2 - Comparaison Économique

**Date :** 31/03/2026
**Facilitateur :** Baptiste (Scrum Master)
**Participants :** Baptiste (Product Manager / Developer)
**Statut :** Terminé

***

## 1. Contexte & Objectifs

**Objectif de l'Epic :** Transformer l'application d'un simple localisateur de stations en un outil de comparaison économique réelle. Permettre à l'utilisateur de connaître la fraîcheur des prix, d'estimer le coût de son plein selon son véhicule, de trier par coût réel intégrant la distance, et d'obtenir des distances routières précises via OSRM et IGN.

### Tâches Réalisées

- [x] **US-02-01 : Prix à Jour et Fraîcheur** — Indicateur coloré de fraîcheur par prix (vert/orange/rouge), badge MAJ repositionné
- [x] **US-02-02 : Calcul du Coût du Plein** — Sélecteur de véhicule, presets, `fillHabit`, composant `FillEstimate` réutilisable
- [x] **US-02-03 : Tri Intelligent Prix/Distance** — Badge "Coût réel" conditionnel, `calculateEffectiveCost`, reset auto si véhicule supprimé
- [x] **US-02-04 : Distances Routières Réelles** — OSRM `/table`, polygone isodistance IGN, tracé d'itinéraire animé, temps de trajet

### Scores de Revue par Story

| Story | Architecture | Code Quality | UI/UX | Performance |
| :--- | :---: | :---: | :---: | :---: |
| US-02-01 Prix à Jour et Fraîcheur | ✅ 4/5 | ✅ 4/5 | ✅ 4/5 | ✅ 4/5 |
| US-02-02 Calcul du Coût du Plein | ✅ 5/5 | ✅ 5/5 | ✅ 5/5 | ✅ 5/5 |
| US-02-03 Tri Intelligent Prix/Distance | ✅ 4/5 | ✅ 4/5 | ✅ 4/5 | ✅ 5/5 |
| US-02-04 Distances Routières Réelles | ✅ 5/5 | ✅ 5/5 | ✅ 5/5 | ✅ 5/5 |

***

## 2. Ce qui s'est bien passé (What went well)

### Implémentations dépassant la spec

- **Feature `fillHabit` (US-02-02) :** La spec demandait un simple calcul `tankCapacity × price`. L'implémentation a ajouté une section "Mes habitudes" permettant de préciser à quel niveau on fait le plein (¼ consommé → réservoir vide). Le calcul plus précis est transmis à US-02-03 sans modification du store.
- **Composant `FillEstimate` extrait (US-02-02) :** La spec suggérait d'inliner le calcul dans `StationCard` et `PriceCard`. L'extraction en composant autonome a évité la duplication et permis le mode `inline` (estimation entre parenthèses) vs `block` (sous le prix) selon le contexte.
- **Retry OSRM + cache de localisation (US-02-04) :** `fetchWithRetry` (2 tentatives, backoff linéaire) et un cache par `locationKey` dans `useRoadDistances` ont été ajoutés sans être spécifiés. Pertinents pour la résilience mobile et la réduction des appels réseau.
- **Tracé d'itinéraire animé + badge temps de trajet (US-02-04) :** Deux commits bonus (`7f3b146`, `bc49942`) ont ajouté la visualisation de l'itinéraire sur la carte et l'affichage du temps de trajet — cohérents avec l'esprit de la story, sans alourdir le code.
- **Skeleton au lieu du spinner (US-02-04) :** La spec demandait un simple `Loader2` pendant le chargement OSRM. L'implémentation a livré un skeleton complet de la liste, meilleure expérience au premier chargement.
- **Zoom automatique sur le polygone isodistance (US-02-04) :** Non spécifié, mais naturel — la carte s'adapte automatiquement au polygone IGN à son arrivée.

### Architecture & Patterns

- **`useIsodistance` dans le store Zustand :** La spec retournait la géométrie depuis le hook. L'implémentation la stocke dans le store, permettant à `InteractiveMap` de la consommer sans prop-drilling. Meilleure séparation des responsabilités.
- **`VehicleInputs` avec `key={vehicleType}` (US-02-02) :** Force le remontage complet du sous-composant à chaque changement de preset, réinitialisant les états locaux sans `useEffect`. Technique propre et documentée.
- **Séparation `distanceMode` persisté / `roadDistances` non persisté :** La distinction entre ce qui doit survivre au rechargement et ce qui doit être recalculé est correcte et bien validée dans le `merge` du store.
- **`useIsodistance` — `locationKey` string :** Résout élégamment le problème d'égalité référentielle des tableaux dans les dépendances `useEffect` (comparaison de chaîne au lieu de tableau).

### Code Review

- Deux sessions de code review approfondies (27/03 et 31/03) ont identifié et corrigé **24 issues** avant clôture de l'epic. L'application est entrée dans l'epic avec une base propre (Epic 1) et en ressort encore plus solide.
- La review du 31/03 a corrigé deux bugs de cohérence non détectés pendant le développement : stats/liste désynchronisées en mode route, et badge "Meilleur coût/trajet" calculé sur une distance différente du tri de la liste.

***

## 3. Ce qui a été difficile (What didn't go well)

### Duplication persistante malgré les retours de l'Epic 1

La rétrospective de l'Epic 1 avait identifié la duplication de code comme point d'amélioration. Des patterns de duplication se sont quand même glissés dans l'Epic 2, nécessitant deux sessions de correction en fin d'epic :

- **`referenceLocation` copié-collé dans 5+ fichiers** : `const referenceLocation = searchLocation ?? userLocation` était répété dans `useFilteredStations`, `useFilteredStats`, `StationList`, `StationListSettings`, `StationDetail`. Extraction dans `useReferenceLocation()` lors de la review du 31/03.
- **`useMediaQuery("(min-width: 768px)")` répété dans 4 fichiers** : même query, même logique, 4 endroits. Extraction dans `useIsDesktop()` lors de la review du 31/03.
- **`filterStationsByLocation` dupliqué dans 3 endroits** : logique de filtrage highway + rayon copiée dans `useFilteredStations`, `useFilteredStats` et `useAppStore`. Extrait lors de la review du 27/03.
- **`applyIsodistanceFilter` dupliqué entre les deux hooks de filtrage** : introduit lors d'US-02-04, immédiatement copié d'un hook à l'autre, extrait lors de la review du 31/03.

### Bugs de cohérence détectés tardvement

- **Stats/liste désynchronisées en mode route (review 31/03, sévérité haute) :** `useFilteredStats` ne filtrait pas sur le même ensemble que `useFilteredStations` en mode isodistance. Le bandeau Min/Médiane/Max affichait des valeurs calculées sur des stations absentes de la liste. Détecté uniquement lors de la review finale.
- **Badge "Meilleur coût/trajet" calculé avec Haversine alors que le tri utilisait OSRM (review 31/03, sévérité haute) :** Le badge et la position #1 ne correspondaient pas en mode route. Même nature que le bug précédent : deux calculs parallèles non synchronisés.

### Issues récurrentes malgré l'Epic 1

- **Dead code** : `conn` inutilisé dans `DuckDBProvider` (review 27/03), `listSortBy` déclaré dans `StationCardProps` mais jamais utilisé (review US-02-04), bloc `toast.info` commenté dans `InteractiveMap` (review 31/03). Le dead code continue d'apparaître malgré l'action item de l'Epic 1.
- **`console.log` de debug** (review 27/03) : `FuelDataLoader` affichait le nombre de stations à chaque fetch. La règle "pas de console.log en prod" n'est pas encore un réflexe systématique.
- **Pattern derived state → `useEffect`** (review 27/03) : reset de `visibleCount` effectué directement pendant le render au lieu d'un `useEffect`. Même famille d'erreur que le conflit d'animation de l'Epic 1 — état React géré hors du cycle normal.

***

## 4. Actions & Améliorations (Action Items)

### Pour l'Epic 3 (Intelligence & Analyse)

- [ ] **Extraire les hooks partagés dès le premier usage, pas en review :** Quand un pattern comme `searchLocation ?? userLocation` est utilisé pour la 2ème fois, l'extraire immédiatement dans un hook plutôt que d'attendre la review.
- [ ] **Vérifier la cohérence des sources de vérité croisées :** Pour tout nouveau calcul affiché à deux endroits (ex: stats + liste, badge + tri), vérifier explicitement qu'ils utilisent la même source de données avant de considérer la story done. Cette classe de bug (US-02-04) est silencieuse et nécessite un effort de réflexion transverse.
- [ ] **Nettoyage dead code en continu :** Après chaque session de développement, passer `rtk lint` et supprimer toute variable/prop déclarée mais non utilisée. Ne pas attendre la review.
- [ ] **Revue intermédiaire à mi-epic :** Prévoir une review de code à mi-parcours (après US-03-01 ou US-03-02) pour éviter d'accumuler 24 corrections en fin d'epic.

### Pour le Futur

- **Monitoring ETL :** L'action item des Epics 0 et 1 reste ouverte. L'Epic 3 dépend des données historiques — adresser avant de démarrer US-03-02 (Mode Analyste) et US-03-03 (Graphique Historique).
- **Test visuel du mode route avant merge :** Le bug stats/liste désynchronisées en mode route aurait pu être détecté par un test visuel simple. Pour tout futur développement impliquant deux modes d'affichage (route / vol d'oiseau, online / offline), vérifier les deux modes avant de marquer done.

***

## 5. Conclusion

L'Epic 2 est livré complet et la qualité d'implémentation est élevée, particulièrement sur US-02-02 et US-02-04 qui dépassent significativement la spec. L'application est passée d'un localisateur à un véritable comparateur économique avec distances routières réelles, estimation personnalisée du plein et tracé d'itinéraire.

Le principal enseignement de cet epic est que **la duplication de code se régénère naturellement** malgré les retours d'epic précédents. Les patterns DRY (`useReferenceLocation`, `useIsDesktop`, `filterStationsByLocation`) n'émergent qu'en review parce qu'ils nécessitent une vue d'ensemble que le développeur n'a pas en cours de story. La solution n'est pas disciplinaire mais structurelle : prévoir une **review intermédiaire à mi-epic** pour détecter ces dérives avant qu'elles ne se consolident.

L'application est prête pour passer à l'**Intelligence & Analyse** (Epic 3) : indicateurs de tendance, mode analyste et graphiques historiques.
