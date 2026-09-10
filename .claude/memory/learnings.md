---
register: learnings
---

## Index

| ID                              | Date       | Pattern observé                                                            | Tags                                                                        |
| ------------------------------- | ---------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [LRN-001](learnings/LRN-001.md) | 2026-04-15 | Instance DuckDB-WASM dédiée par département + retry évite les crashs       | #duckdb-wasm #crash #retry #per-instance #web-worker                        |
| [LRN-002](learnings/LRN-002.md) | 2026-04-16 | TTL glissant 24h → invalidation quotidienne par date UTC                   | #cache #ttl #invalidation #utc #indexeddb                                   |
| [LRN-003](learnings/LRN-003.md) | 2026-04-21 | Singleton promise sur l'ouverture IndexedDB évite les connexions N×        | #indexeddb #singleton #promise #race-condition #performance                 |
| [LRN-004](learnings/LRN-004.md) | 2026-04-21 | Un action item de rétro reporté sans décision sur 3 epics devient du bruit | #retrospective #process #action-item #bmad #accountability                  |
| [LRN-005](learnings/LRN-005.md) | 2026-09-10 | COEP `require-corp` bloque silencieusement les analytics tiers             | #coep #posthog #duckdb-wasm #sharedarraybuffer #silent-failure #next-config |
| [LRN-006](learnings/LRN-006.md) | 2026-09-10 | `$host` protège des tests, pas des collisions de noms d'events inter-app   | #posthog #app-property #event-naming #collision #shared-project #ifecho     |
