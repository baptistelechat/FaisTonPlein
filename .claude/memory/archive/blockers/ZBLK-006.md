---
id: ZBLK-006
type: blocker
date: 2026-09-23
tags:
  [
    posthog,
    vercel,
    env-vars,
    next-public,
    build-time,
    silent-failure,
    analytics,
  ]
---

# ZBLK-006 — Aucun event PostHog en production : env var absente de Vercel

| Friction                                                                                                                                                                          | Cause réelle                                                                                                                                                                                                                                                                                                                                                                    | Solution                                                                                                                                                                                                                                                                                                                                                              | Statut |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Dashboard PostHog entièrement vide 13 jours après le déploiement de l'Epic 6 ("There are no matching events for this query" sur toutes les tiles), aucune erreur visible côté app | Le projet Vercel `fais-ton-plein` n'avait **aucune** variable d'environnement définie. `NEXT_PUBLIC_POSTHOG_KEY` étant absente au moment du build, Next.js ne l'a pas inlinée et a laissé l'accès en lecture dynamique de `process.env` (objet vide côté client) → `undefined` → le guard `enabled` de `PostHogProvider.tsx` renvoyait `false` → `posthog.init()` jamais appelé | Suspects mémoire écartés par vérification directe : header COEP bien à `credentialless` ([ZBLK-004](ZBLK-004.md)), propriété `app` bien registered ([ZBLK-005](ZBLK-005.md)). Ajout de `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST` sur l'environnement Production, puis redeploy — l'inlining n'a lieu qu'au build | résolu |

**Chaîne de diagnostic (du moins au plus coûteux) :** requête HogQL groupée par `app` / `$host` → 66 events seulement, tous depuis `localhost:310x` et datés du 10 septembre, aucun depuis un host de production. Puis recherche de `phc_` dans les 12 chunks JS servis → absente. Puis lecture du chunk compilé → `t.default.env.NEXT_PUBLIC_POSTHOG_KEY` encore en clair, alors que le `NODE_ENV === "production"` du même guard avait bien disparu au profit de sa valeur : preuve que l'inlining fonctionnait et que seule cette variable-là manquait.

**Vérification du fix en 3 niveaux**, dans cet ordre : (1) `phc_` présent dans le bundle servi, (2) requête réelle vers `https://eu.i.posthog.com/e/` observée via l'API `performance`, (3) events `session_start` / `geoloc_result` confirmés en HogQL avec `app: "faistonplein"`.

Voir aussi GLRN-289 (non-inlining silencieux) et GLRN-291 (indicateur d'init trompeur) en mémoire globale.

## Références

- [BDR-008](../../decisions/BDR-008.md) — scope Production retenu lors du fix
- [ZBLK-004](ZBLK-004.md) — suspect écarté (COEP)
- [ZBLK-005](ZBLK-005.md) — suspect écarté (collision ifecho)
