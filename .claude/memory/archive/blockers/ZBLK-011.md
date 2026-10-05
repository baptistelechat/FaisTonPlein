---
id: ZBLK-011
type: blocker
date: 2026-10-05
tags: [pnpm, launch-json, node-modules, pnpm-workspace, preview]
---

# ZBLK-011 — pnpm 12 du lanceur a réinstallé la racine

| Friction | Cause réelle | Solution | Statut |
| --- | --- | --- | --- |
| Le preview du studio ne démarrait pas, et `pnpm-workspace.yaml` s'est retrouvé modifié avec les `node_modules` racine réinstallés. | Le lanceur a résolu pnpm 12 (winget) au lieu de 9.9, qui a relancé une installation du workspace et échoué sur `ERR_PNPM_IGNORED_BUILDS`. | Bloc `allowBuilds` retiré, `pnpm install --frozen-lockfile` avec pnpm 9.9, build revérifié, lanceur passé sur `npm --prefix video run dev`. | résolu |

## Références

- [LRN-016](../../learnings/LRN-016.md) — pattern extrait
