---
id: ZBLK-002
type: blocker
date: 2026-04-21
tags: [recharts, dependencies, pnpm, build]
---

# ZBLK-002 — `recharts` déclaré dans package.json mais absent de node_modules

| Friction                                                                 | Cause réelle                                                                 | Solution                              | Statut |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------- | ------ |
| Build de US-04-01 en échec, dépendance `recharts` introuvable au runtime | Dérive entre `package.json` et `node_modules` non détectée en début de story | `pnpm install` avant l'implémentation | résolu |

A donné naissance à l'accord d'équipe "Health-check deps en début de story" : vérifier `pnpm install` avant de démarrer toute implémentation si les dépendances ont pu évoluer entre deux stories.

## Références

- [BDR-001](../../decisions/BDR-001.md) — story concernée par ce blocage (US-04-01)
