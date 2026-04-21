# Rétrospective : Epic 3 - Intelligence & Analyse

**Date :** 11/04/2026
**Facilitateur :** Baptiste (Scrum Master)
**Participants :** Baptiste (Product Manager / Developer)
**Statut :** Terminé

---

## 1. Contexte & Objectifs

**Objectif de l'Epic :** Transformer le comparateur économique en outil d'analyse des tendances marché. Permettre à l'utilisateur de savoir si un prix est en hausse ou en baisse, et visualiser l'évolution des prix sur 30 jours.

### Tâches Réalisées

- [x] **US-03-01 : Indicateur de Tendance** — Flèche ↑↓→ dans `StationCard` et `PriceCard`, calcul AVG 7j via DuckDB multi-fichiers rolling, fallback silencieux si données indisponibles
- [x] **US-03-02 : Mode Analyste** — Toggle settings + stats avancées + gate bouton Historique — **SUPPRIMÉ après implémentation** (commit `c6a08bc`)
- [x] **US-03-03 : Graphique Historique** — Graphique Recharts 30j dans `StationDetail`, sélecteur de plage temporelle (7/14/30j), gestion des ruptures d'approvisionnement, cache session par station/carburant

### Scores de Revue par Story

| Story                           | Architecture | Code Quality | UI/UX  | Performance |
| :------------------------------ | :----------: | :----------: | :----: | :---------: |
| US-03-01 Indicateur de Tendance |    ✅ 5/5    |    ✅ 5/5    | ✅ 4/5 |   ✅ 4/5    |
| US-03-02 Mode Analyste          |     N/A      |     N/A      |  N/A   |     N/A     |
| US-03-03 Graphique Historique   |    ✅ 4/5    |    ✅ 4/5    | ✅ 5/5 |   ✅ 4/5    |

---

## 2. Ce qui s'est bien passé (What went well)

### Implémentations dépassant la spec

- **Stratégie HEAD probe (US-03-01) :** La spec suggérait un `try/catch` global sur la query DuckDB pour gérer les fichiers manquants. L'implémentation a opté pour un test `fetch HEAD` sur chaque URL avant de construire la liste — aucune exception DuckDB possible, comportement plus robuste.
- **Cache session `useRef<Map>` (US-03-03) :** La spec demandait un simple cache. L'implémentation a utilisé un `Map` keyed par `${stationId}_${fuelType}` en `useRef` local au hook — propre, sans pollution du store global Zustand, et réutilisable entre changements de station.
- **Gestion des ruptures d'approvisionnement (US-03-03) :** Non spécifié dans la story. L'implémentation a ajouté une visualisation des périodes de rupture directement sur le graphique — valeur ajoutée réelle pour l'utilisateur.
- **Sélecteur de plage temporelle 7/14/30j (US-03-03) :** Enrichissement non spécifié, cohérent avec l'esprit analytique de l'epic.
- **Architecture rolling file (refactor post-implémentation) :** Le passage de 30 fichiers journaliers individuels à un seul fichier rolling 30 jours (un par département) est une simplification majeure : 1 seule requête DuckDB au lieu de 30, plus simple à maintenir.

### Architecture & Patterns

- **Source de vérité unique respectée (US-03-01) :** Le store `priceTrends` est l'unique source — `StationCard` et `PriceCard` lisent tous deux le store, pas de calcul dupliqué.
- **Anti-patterns Epic 2 documentés ET respectés :** La section "Anti-patterns à éviter (leçons Epic 2)" dans la story US-03-01 a été suivie à la lettre — 0 `console.log` debug, 0 variable inutilisée, 0 duplication de logique de tendance.
- **`CAST(id AS VARCHAR)` dans les requêtes DuckDB :** Les IDs sont stockés en bigint dans les Parquets — ce cast est documenté et systématiquement appliqué pour éviter les erreurs de typage.

### Process

- **Revue intermédiaire à mi-epic réalisée :** L'action item de l'Epic 2 a été appliquée — review US-03-01 le 07/04 avant de passer à US-03-02. 5 patches appliqués dont un bug de `arePriceTrendsLoading` restant `true` indéfiniment si le composant était démonté.

---

## 3. Ce qui a été difficile (What didn't go well)

### Story US-03-02 implémentée puis supprimée

C'est **l'événement structurant de l'Epic 3**. La story Mode Analyste a été implémentée complètement (toggle settings, stats avancées, gate bouton Historique), reviewée, marquée "done" — puis retirée intégralement via le commit `c6a08bc ♻️ Remove analyst mode feature`.

**Cause racine :** La spec était trop prescriptive sur le **comment** (un toggle "Mode Analyste" dans les settings) sans avoir validé que ce modèle d'interaction était le bon. Après implémentation et utilisation réelle, la décision a été prise d'exposer directement les fonctionnalités sans gate de mode.

**Impact :** Une story entière de travail sans valeur livrée dans le produit final. US-03-03 a dû être réécrite en ignorant `analystMode`.

### Spec divergeant de l'implémentation (US-03-03)

La review US-03-03 a identifié que **l'implémentation divergeait complètement de la spec** : modèle rolling 30j vs 30 fichiers journaliers, chargement automatique vs à la demande, graphique intégré vs modal. La divergence était meilleure techniquement, mais elle n'avait pas été documentée avant l'implémentation.

### Patches de review non fermés dans le story file (US-03-03)

Plusieurs patches de review (`augmentWithOutageBridge`, `deltaPct`, `Math.min/max`) ont été adressés dans des commits ultérieurs (`e40866a`, `1285b89`, `26e4a23`) mais le fichier story n'a pas été mis à jour. Le fichier affiche encore des items `[ ]` alors que les issues sont résolues.

### Dead code identifié en fin d'epic (revue globale)

- `ROLLING_BASE_URL` dupliquée entre `priceTrends.ts` et `priceHistory.ts`
- Prop `trend` déclarée dans `PriceMarkerProps` mais jamais utilisée
- Bloc JSX commenté (`showBestBadge`) dans `PriceMarker.tsx`
- URL `latest` codée en dur dans `FuelDataLoader.tsx` sans passer par `constants.ts`

---

## 4. Suivi des Actions de l'Epic 2

| Action                                       | Résultat                                                            | Statut |
| -------------------------------------------- | ------------------------------------------------------------------- | ------ |
| Extraire les hooks partagés dès le 1er usage | `getDeptFromStationId` et `filterAvailableUrls` exportés proprement | ✅     |
| Cohérence des sources de vérité croisées     | Store `priceTrends` = source unique, jamais dupliqué                | ✅     |
| Nettoyage dead code en continu               | 0 `console.log` debug, 0 import inutilisé                           | ✅     |
| Revue intermédiaire à mi-epic                | Review US-03-01 réalisée le 07/04                                   | ✅     |
| Monitoring ETL (carryover Epic 0–1)          | Non adressé                                                         | ❌     |

---

## 5. Actions & Améliorations (Action Items)

### Corrections immédiates appliquées en fin d'Epic 3

- [x] Extraire `ROLLING_BASE_URL` et `LATEST_BASE_URL` dans `constants.ts`
- [x] Supprimer prop `trend` non utilisée dans `PriceMarker.tsx`
- [x] Supprimer bloc JSX commenté `showBestBadge` dans `PriceMarker.tsx`
- [x] Refactorer composants > 200 lignes (`InteractiveMap`, `useAppStore`, `StationListSettings`, `StationList/index`, `StationDetail/index`)

### Pour l'Epic 4 (Résilience Offline)

- [ ] **Valider l'approche technique avant d'implémenter :** Pour toute story dont l'implémentation nécessite des choix non triviaux (architecture du cache offline, IndexedDB vs ServiceWorker), documenter la décision dans les Dev Notes ET en discuter avant de coder — pas en review.
- [ ] **Fermer les patches de review dans le story file le jour du commit de fix :** Si un bug de review est corrigé dans un commit ultérieur, cocher `[x]` dans le story file immédiatement.
- [ ] **Monitoring ETL :** Carryover de l'Epic 0. Adresser avant US-04-01 (Cache Départemental) qui dépend de la fraîcheur des données.

### Pour le Futur

- **Décision de suppression de feature :** Si une feature implémentée est retirée, documenter dans la rétrospective (ou un ADR) : pourquoi, quel était le problème avec l'approche initiale, ce qui a changé dans la vision produit.

---

## 6. Conclusion

L'Epic 3 livre un outil d'analyse fonctionnel : indicateur ↑↓→ en temps réel basé sur la moyenne 7 jours, graphique d'évolution 30 jours avec gestion des ruptures et sélecteur de plage temporelle. La qualité technique de US-03-01 et US-03-03 est élevée.

Le principal enseignement est qu'**une spec prescriptive sur l'UI sans validation préalable génère du gaspillage** : US-03-02 a été entièrement implémentée et retirée. La solution n'est pas de moins spécifier, mais de **valider l'approche d'interaction avant de coder** — notamment pour les features "mode" ou "gate" qui nécessitent d'être testées à l'usage.

L'application est prête pour passer à la **Résilience Offline** (Epic 4) : cache départemental et consultation sans réseau.
