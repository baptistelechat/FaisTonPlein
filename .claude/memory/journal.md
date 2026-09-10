---
register: journal
---

## 2026-09-10

Reprise du projet FaisTonPlein après une pause depuis avril 2026 (dernier commit sur la branche `analytics` en date du 22/04). Recap de l'existant : les Epics 0 à 4 sont terminés (fondations ETL/DuckDB, exploration géographique, comparaison économique, intelligence & analyse, résilience offline). Epic 5 (Observabilité & Santé) et Epic 6 (Analytics comportemental & RGPD) sont en `backlog` — seule une session de brainstorming a eu lieu, aucun code écrit. Stack analytics retenue : PostHog Cloud EU + route `/api/health` surveillée par Uptime Kuma.

Décision prise : garder `sprint-status.yaml` et BMAD le temps de terminer Epic 5 et 6, puis retirer BMAD complètement et archiver `_bmad-output/` dans `docs/archive/` pour ne rien perdre. Mise en place de `.claude/memory/` (ce registre) comme infrastructure de continuité inter-session, jamais implémentée jusqu'ici sur ce projet — objectif : reprendre en main le projet avec le fonctionnement actuel de Baptiste.

**Entrées clés :**

- [BDR-003](decisions/BDR-003.md) — stack analytics PostHog Cloud EU + Uptime Kuma
- [BDR-004](decisions/BDR-004.md) — abandon progressif de BMAD après clôture Epic 5/6
- [ZBLK-001](archive/blockers/ZBLK-001.md) — monitoring ETL, objet direct de l'Epic 5

---

Epic 5 (Observabilité & Santé) et Epic 6 (Analytics comportemental & RGPD) implémentés de bout en bout en autonomie, code-complete. Côté Epic 5 : route `/api/health` (fraîcheur ETL, taux d'erreur, nombre de stations), provider PostHog EU, error tracking silencieux via `posthog.captureException`. Côté Epic 6 : 23 events comportementaux couvrant toute l'app (session, navigation, filtres, réglages, géoloc, recherche, PWA, historique des prix), page `/confidentialite` RGPD, dashboard PostHog complet (26 tiles, 7 sections) construit entièrement via l'API REST puis le MCP officiel PostHog plutôt que par manipulation manuelle du navigateur.

Deux bugs de production réellement bloquants trouvés et corrigés en cours de route, tous deux invisibles en usage normal : le COEP `require-corp` (ajouté pour DuckDB-WASM) bloquait silencieusement tout envoi vers PostHog, et une collision de noms d'events avec le projet ifecho (projet PostHog partagé) faussait le dashboard sans erreur visible. Les deux sont documentés comme blocages ([BLK-004](blockers/BLK-004.md), [BLK-005](blockers/BLK-005.md)) en plus des patterns déjà extraits ([LRN-005](learnings/LRN-005.md), [LRN-006](learnings/LRN-006.md)).

Seul point encore ouvert : le déploiement effectif de la branche `analytics` (push + Vercel + réactivation du monitor Uptime Kuma), qui nécessite l'autorisation de Baptiste — hors scope de cette session. Session clôturée avec `/changelog` (une seule ligne ajoutée : page confidentialité, le reste de l'instrumentation analytics étant invisible côté utilisateur), `/gen-commit` (rien à committer, tout le code était déjà commité en étapes) et ce rituel `/memory-close`.

**Entrées clés :**

- [BLK-004](blockers/BLK-004.md) — bug COEP bloquant PostHog en silence
- [BLK-005](blockers/BLK-005.md) — collision d'events avec ifecho faussant le dashboard

---

Diagnostic et fix des faux positifs Uptime Kuma sur `/api/health`, remontés par Baptiste via une capture Telegram. Deux causes cumulées trouvées : un seuil de staleness égal à la fréquence du cron ETL combiné au cache Next 5min de la route (flapping Down/Up en ~5min), et l'instance RPi self-hosted (`pm2: faistonplein`) 24 commits en retard — antérieure même à la création de la route, d'où le 404 initial. Le fix (déjà écrit dans le working tree, jamais commité) a été vérifié (lint/build OK) puis pushé sur `main` (`67d1886`). Le RPi a ensuite été resynchronisé : `git pull`, upgrade pnpm global 8.15.1 → 10.30.3 (lockfile local en `9.0`, incompatible avec l'ancien pnpm), `pnpm install`, `pnpm build`, `pm2 restart` — `/api/health` vérifié `200 healthy` en direct. Découverte annexe : ce process RPi tourne en réalité `next dev --experimental-https`, pas un build de prod.

`BLK-001` (monitoring ETL, reporté depuis Epic 0) marqué résolu et archivé en [ZBLK-001](archive/blockers/ZBLK-001.md). Trois patterns extraits ([LRN-008](learnings/LRN-008.md), [LRN-009](learnings/LRN-009.md), [LRN-010](learnings/LRN-010.md)) et une décision ([BDR-007](decisions/BDR-007.md)) — tous gardés en local à la demande de Baptiste plutôt que promus en mémoire globale, malgré leur portée générique.

**Entrées clés :**

- [ZBLK-001](archive/blockers/ZBLK-001.md) — monitoring ETL, enfin résolu
- [LRN-007](learnings/LRN-007.md) — diagnostic complet du double faux positif
- [BDR-007](decisions/BDR-007.md) — upgrade pnpm global RPi plutôt que régénérer le lockfile
