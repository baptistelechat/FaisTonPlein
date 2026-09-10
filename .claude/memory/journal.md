---
register: journal
---

## 2026-09-10

Reprise du projet FaisTonPlein après une pause depuis avril 2026 (dernier commit sur la branche `analytics` en date du 22/04). Recap de l'existant : les Epics 0 à 4 sont terminés (fondations ETL/DuckDB, exploration géographique, comparaison économique, intelligence & analyse, résilience offline). Epic 5 (Observabilité & Santé) et Epic 6 (Analytics comportemental & RGPD) sont en `backlog` — seule une session de brainstorming a eu lieu, aucun code écrit. Stack analytics retenue : PostHog Cloud EU + route `/api/health` surveillée par Uptime Kuma.

Décision prise : garder `sprint-status.yaml` et BMAD le temps de terminer Epic 5 et 6, puis retirer BMAD complètement et archiver `_bmad-output/` dans `docs/archive/` pour ne rien perdre. Mise en place de `.claude/memory/` (ce registre) comme infrastructure de continuité inter-session, jamais implémentée jusqu'ici sur ce projet — objectif : reprendre en main le projet avec le fonctionnement actuel de Baptiste.

**Entrées clés :**

- [BDR-003](decisions/BDR-003.md) — stack analytics PostHog Cloud EU + Uptime Kuma
- [BDR-004](decisions/BDR-004.md) — abandon progressif de BMAD après clôture Epic 5/6
- [BLK-001](blockers/BLK-001.md) — monitoring ETL, objet direct de l'Epic 5

---

Epic 5 (Observabilité & Santé) et Epic 6 (Analytics comportemental & RGPD) implémentés de bout en bout en autonomie, code-complete. Côté Epic 5 : route `/api/health` (fraîcheur ETL, taux d'erreur, nombre de stations), provider PostHog EU, error tracking silencieux via `posthog.captureException`. Côté Epic 6 : 23 events comportementaux couvrant toute l'app (session, navigation, filtres, réglages, géoloc, recherche, PWA, historique des prix), page `/confidentialite` RGPD, dashboard PostHog complet (26 tiles, 7 sections) construit entièrement via l'API REST puis le MCP officiel PostHog plutôt que par manipulation manuelle du navigateur.

Deux bugs de production réellement bloquants trouvés et corrigés en cours de route, tous deux invisibles en usage normal : le COEP `require-corp` (ajouté pour DuckDB-WASM) bloquait silencieusement tout envoi vers PostHog, et une collision de noms d'events avec le projet ifecho (projet PostHog partagé) faussait le dashboard sans erreur visible. Les deux sont documentés comme blocages ([BLK-004](blockers/BLK-004.md), [BLK-005](blockers/BLK-005.md)) en plus des patterns déjà extraits ([LRN-005](learnings/LRN-005.md), [LRN-006](learnings/LRN-006.md)).

Seul point encore ouvert : le déploiement effectif de la branche `analytics` (push + Vercel + réactivation du monitor Uptime Kuma), qui nécessite l'autorisation de Baptiste — hors scope de cette session. Session clôturée avec `/changelog` (une seule ligne ajoutée : page confidentialité, le reste de l'instrumentation analytics étant invisible côté utilisateur), `/gen-commit` (rien à committer, tout le code était déjà commité en étapes) et ce rituel `/memory-close`.

**Entrées clés :**

- [BLK-004](blockers/BLK-004.md) — bug COEP bloquant PostHog en silence
- [BLK-005](blockers/BLK-005.md) — collision d'events avec ifecho faussant le dashboard
