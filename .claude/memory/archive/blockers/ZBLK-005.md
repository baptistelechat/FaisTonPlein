---
id: ZBLK-005
type: blocker
date: 2026-09-10
tags:
  [posthog, event-collision, shared-project, dashboard, ifecho, data-integrity]
---

# ZBLK-005 — Collision de noms d'events avec ifecho fausse le dashboard

| Friction                                                                                                                                                    | Cause réelle                                                                                                                                                                                                                                                | Solution                                                                                                                                                                                                                                                | Statut |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| L'insight "Funnel installation PWA" affichait 1 point de donnée alors qu'aucun vrai trafic FaisTonPlein n'existait, tout le reste du dashboard restant vide | `pwa_install_banner_shown`, `pwa_install_clicked`, `pwa_installed` sont les mêmes noms d'event utilisés par ifecho sur le même projet PostHog partagé — le filtre `$host` protège des tests mais pas des collisions entre deux apps de production légitimes | Diagnostic via requête HogQL directe sur `properties['$host']` de l'event en question, confirmant sa provenance ifecho. Script Python en une passe patchant les 19 insights du dashboard pour ajouter un filtre `app = "faistonplein"` sur chaque série | résolu |

## Références

- [LRN-006](../../learnings/LRN-006.md) — pattern générique extrait de ce blocage
- [BDR-005](../../decisions/BDR-005.md) — décision d'origine du partage de projet avec ifecho
