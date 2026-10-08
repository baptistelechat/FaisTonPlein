---
id: ZBLK-012
type: blocker
date: 2026-10-05
tags: [remotion, rspack, alias, override-config, bundler]
---

# ZBLK-012 — Alias @ ignoré au rendu Remotion

| Friction | Cause réelle | Solution | Statut |
| --- | --- | --- | --- |
| `Module not found: Can't resolve '@/lib/constants'` au rendu alors que `tsc` passait ; même symptôme ensuite avec `uisfx/sounds`. | `overrideWebpackConfig` n'a aucun effet quand Rspack est activé ; le champ `exports` de `uisfx` n'expose pas le dossier `sounds/`. | `Config.overrideRspackConfig` pour l'alias ; `require.context` sur un chemin relatif vers `node_modules/uisfx/sounds`. | résolu |

## Références

- [LRN-013](../../learnings/LRN-013.md) — pattern extrait
