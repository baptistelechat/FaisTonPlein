---
register: learnings
---

## Index

| ID                              | Date       | Pattern observé                                                                     | Tags                                                                                     |
| ------------------------------- | ---------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [LRN-001](learnings/LRN-001.md) | 2026-04-15 | Instance DuckDB-WASM dédiée par département + retry évite les crashs                | #duckdb-wasm #crash #retry #per-instance #web-worker                                     |
| [LRN-002](learnings/LRN-002.md) | 2026-04-16 | TTL glissant 24h → invalidation quotidienne par date UTC                            | #cache #ttl #invalidation #utc #indexeddb                                                |
| [LRN-003](learnings/LRN-003.md) | 2026-04-21 | Singleton promise sur l'ouverture IndexedDB évite les connexions N×                 | #indexeddb #singleton #promise #race-condition #performance                              |
| [LRN-004](learnings/LRN-004.md) | 2026-04-21 | Un action item de rétro reporté sans décision sur 3 epics devient du bruit          | #retrospective #process #action-item #bmad #accountability                               |
| [LRN-005](learnings/LRN-005.md) | 2026-09-10 | COEP `require-corp` bloque silencieusement les analytics tiers                      | #coep #posthog #duckdb-wasm #sharedarraybuffer #silent-failure #next-config              |
| [LRN-006](learnings/LRN-006.md) | 2026-09-10 | `$host` protège des tests, pas des collisions de noms d'events inter-app            | #posthog #app-property #event-naming #collision #shared-project #ifecho                  |
| [LRN-007](learnings/LRN-007.md) | 2026-09-10 | Seuil staleness == fréquence cron + instance RPi jamais déployée = faux positifs    | #uptime-kuma #api-health #revalidate #cache #cron #false-positive #rpi #deployment-drift |
| [LRN-008](learnings/LRN-008.md) | 2026-09-10 | Seuil de staleness cron doit avoir une marge, jamais == l'intervalle nominal        | #monitoring #health-check #cron #cache #revalidate #false-positive                       |
| [LRN-009](learnings/LRN-009.md) | 2026-09-10 | Instance self-hosted à côté du cloud = angle mort de diagnostic monitoring          | #monitoring #self-hosted #rpi #deployment-drift #diagnosis #blind-spot                   |
| [LRN-010](learnings/LRN-010.md) | 2026-09-10 | Wrapper `docker-monitor` NAS NOPASSWD limité à ps/stats/logs/inspect/version/images | #nas #docker #sudo #docker-monitor #uptime-kuma #readonly-audit                          |
| [LRN-011](learnings/LRN-011.md) | 2026-09-23 | Deux rendus de « €/L » : PriceCard vs StationCard | #price-card #station-card #unit-style #consistency |
| [LRN-012](learnings/LRN-012.md) | 2026-09-23 | Overlay à largeur variable : container query, pas media query | #tailwind4 #container-query #responsive #layout #sidebar #overlay |
| [LRN-016](learnings/LRN-016.md) | 2026-10-05 | Le lanceur de preview peut résoudre un autre pnpm | #pnpm #launch-json #preview #node-modules #windows #winget |
| [LRN-013](learnings/LRN-013.md) | 2026-10-05 | Pièges Remotion sous Rspack (alias, props, require.context) | #remotion #rspack #alias #require-context #exports #typescript |
| [LRN-014](learnings/LRN-014.md) | 2026-10-05 | Schéma Zod = sélecteurs dans le Studio Remotion | #remotion #studio #zod #schema #props #inspector |
| [LRN-015](learnings/LRN-015.md) | 2026-10-05 | Musique libre par API : ce qui marche vraiment | #musique #licence #cc-by #openverse #jamendo #pixabay #api |
| [LRN-017](learnings/LRN-017.md) | 2026-10-08 | Le scanner de liens Meta crée des visites et erreurs WebGL | #meta #bot #webgl #posthog #maplibre #fbclid #faux-positif |
| [LRN-018](learnings/LRN-018.md) | 2026-10-08 | Un bloqueur DNS local casse l'OAuth du MCP PostHog | #dns #pihole #posthog #mcp #oauth #err-name-not-resolved |
| [LRN-019](learnings/LRN-019.md) | 2026-10-08 | `visibilitychange` seul, `beforeunload` en plus double le beacon | #visibilitychange #beforeunload #beacon #analytics #double-count |
| [LRN-020](learnings/LRN-020.md) | 2026-10-08 | `session_ended` : sans UTM, plusieurs par visite | #posthog #session-ended #utm #beacon #dashboard #uniques |
| [LRN-021](learnings/LRN-021.md) | 2026-10-10 | Instagram complète les UTM sans écraser ceux déjà posés | #instagram #utm #posthog #fbclid #link-in-bio #acquisition |
| [LRN-022](learnings/LRN-022.md) | 2026-10-10 | Skill générateur : réglages côté projet + graine du projet | #skill #generateur #seed #config-projet #hardcode #brag-series #reutilisation |
| [LRN-023](learnings/LRN-023.md) | 2026-10-10 | Prouver un refactor de générateur par empreinte des sorties | #refactor #hash #non-regression #audio #generateur #verification |
