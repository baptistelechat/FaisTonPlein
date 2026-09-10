---
id: ZBLK-001
type: blocker
date: 2026-04-21
tags: [etl, monitoring, health-check, epic-5, carryover]
---

# ZBLK-001 — Monitoring ETL reporté depuis Epic 0, jamais adressé

| Friction                                                                                                                                            | Cause réelle                                                                                   | Solution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Statut |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Aucune visibilité sur le succès/échec réel de l'ETL en production (Baptiste ne sait pas si les données sont à jour tant que personne ne le signale) | Item reporté silencieusement de rétro en rétro sans décision formelle, sur 5 epics consécutifs | Route `/api/health` (US-05-01) codée. Deux causes de faux positifs/404 identifiées et corrigées le 2026-09-10 : seuil de staleness égal à la fréquence du cron ETL ([LRN-007](../../learnings/LRN-007.md)), et l'instance RPi self-hosted (`pm2: faistonplein`) 24 commits en retard — n'avait jamais reçu la route elle-même. Fix pushé sur `main` (`67d1886`) + RPi resynchronisé (`git pull` + `pnpm install` + `pm2 restart`), `/api/health` vérifié `200 healthy` en direct sur le RPi | résolu |

Ce blocage est directement l'objet de l'Epic 5 (US-05-01), qui est code-complete. La règle des 3 epics ([LRN-004](../../learnings/LRN-004.md)) a été formalisée en réaction à ce report répété.

## Références

- [LRN-004](../../learnings/LRN-004.md) — pattern de report silencieux identifié via ce blocage
- [LRN-007](../../learnings/LRN-007.md) — diagnostic détaillé et fix de ce blocage
- [BDR-003](../../decisions/BDR-003.md) — stack retenue pour résoudre ce blocage
