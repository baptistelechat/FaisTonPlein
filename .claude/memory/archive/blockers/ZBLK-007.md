---
id: ZBLK-007
type: blocker
date: 2026-09-23
tags:
  [
    posthog,
    analytics,
    session-ended,
    beforeunload,
    visibilitychange,
    beacon,
    double-count,
  ]
---

# ZBLK-007 — `session_ended` compté deux fois, `session_start` manquant

| Friction                                                                                                                                                              | Cause réelle                                                                                                                                                                                                                                                                            | Solution                                                                                                                         | Statut |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Première remontée de données réelles après le fix de [ZBLK-006](ZBLK-006.md) : 2 events `session_ended` depuis un même host, sans aucun `session_start` correspondant | `PostHogProvider.tsx` branchait `handleSessionEnded` à la fois sur `visibilitychange → hidden` et sur `beforeunload` : les deux tirent à la fermeture d'un onglet. Vérifié le 2026-10-08 sur 30 jours de prod : 9 visites sur 28 avaient deux `session_ended` à moins de 300 ms d'écart | Listener `beforeunload` retiré, `visibilitychange` reste le seul déclencheur (commit `c2be792`, sur `development` le 2026-10-08) | résolu |

**Volet « `session_start` manquant » : infirmé.** Sur la même période, 35 `session_start` pour 35 `$pageview`. L'alerte initiale venait d'un échantillon de 2 events sur des URL de déploiement.

**Ce qui reste hors de ce blocker :** plusieurs `session_ended` par visite restent normaux (un par passage en arrière-plan), voir [LRN-020](../../learnings/LRN-020.md). Les visites sans aucun `session_ended` sont suivies dans [BLK-015](../../blockers/BLK-015.md).

## Références

- [ZBLK-006](ZBLK-006.md) — c'est l'arrivée des premières données prod qui a rendu ce défaut observable
- [LRN-019](../../learnings/LRN-019.md) — pattern extrait : `visibilitychange` seul
