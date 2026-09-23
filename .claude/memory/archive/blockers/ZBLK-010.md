---
id: ZBLK-010
type: blocker
date: 2026-09-23
tags: [pm2, rpi, dist, gitignore, tsc, deployment, etl]
---

# ZBLK-010 — pm2 restart après git pull, l'ETL a continué de tourner sur un dist/ compilé périmé

| Friction                                                                                                                                                                                                                                        | Cause réelle                                                                                                                                                                              | Solution                                                                                                                                          | Statut |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `git pull` + `pm2 restart faistonplein fais-ton-plein_etl` déclarés terminés, mais un contrôle de vérification (`pm2 describe`, mtime, grep du contenu compilé) a montré que l'ETL exécutait toujours l'ancien code, sans le champ `fuel_stats` | `etl/dist/` est listé dans `.gitignore` et datait du 17 avril : `git pull` met à jour les sources `.ts`, jamais le JS compilé que pm2 lance réellement (`script path: etl/dist/index.js`) | `pnpm build` (`tsc`) relancé dans `etl/`, vérifié via `grep fuel_stats dist/src/transform.js`, puis `pm2 restart fais-ton-plein_etl --update-env` | résolu |

Détecté avant d'annoncer le déploiement terminé, grâce à une vérification systématique post-restart plutôt qu'une confiance dans le statut `online` de pm2 seul — un process `online` ne dit rien du code qu'il exécute réellement.

## Références

- Voir aussi GLRN-299 (mémoire globale) — le pattern généralisé extrait de cet incident
- [BDR-011](../../decisions/BDR-011.md) — le fix de fond côté fuel_history, révélé par ce même déploiement
