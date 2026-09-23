---
register: blockers
---

## Index

| ID                             | Date       | Friction                                                          | Tags                                                                       | Statut |
| ------------------------------ | ---------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- | ------ |
| [BLK-003](blockers/BLK-003.md) | 2026-04-21 | Téléchargements cache sans AbortController (composant démonté)    | #abortcontroller #usedeptcache #memory-leak #race-condition                | ouvert |
| [BLK-007](blockers/BLK-007.md) | 2026-09-23 | `session_ended` compté 2x, `session_start` manquant               | #posthog #analytics #session-ended #beforeunload #visibilitychange #beacon | ouvert |
| [BLK-010](blockers/BLK-010.md) | 2026-09-23 | pm2 restart après git pull, ETL toujours sur dist/ compilé périmé | #pm2 #rpi #dist #gitignore #tsc #deployment #etl                           | résolu |
