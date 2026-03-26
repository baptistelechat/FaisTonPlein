# Code Review - Story 0.2 (Intégration DuckDB)
**Date :** 11 Mars 2026
**Méthodologie :** BMAD (BMM Level)
**Story :** US-00-02-Integration-DuckDB

## 📊 Résumé de la Revue

| Catégorie | Statut | Score | Commentaire |
| :--- | :---: | :---: | :--- |
| **Architecture** | ✅ | 4.5/5 | Intégration WASM propre via Context/Provider. |
| **Code Quality** | ⚠️ | 3.5/5 | Quelques `ts-ignore` et une double initialisation potentielle. |
| **Performance** | ⚠️ | 3/5 | Manque les headers HTTP pour l'accélération WASM (SharedArrayBuffer). |
| **Data Fetching** | ✅ | 5/5 | Chargement direct Parquet depuis Hugging Face efficace. |

---

## 🔍 Analyse Détaillée

### 1. Architecture DuckDB-WASM

**✅ Points Forts**
- Séparation claire des responsabilités : `DuckDBProvider` gère l'instance, `FuelDataLoader` gère la logique métier.
- Utilisation des bundles manuels (`mvp`, `eh`) pour une meilleure compatibilité navigateur.
- Gestion correcte du cycle de vie (connexion/déconnexion) dans les `useEffect`.

**⚠️ Points d'Attention**
- **Strict Mode React** : Le `useEffect` d'initialisation dans `DuckDBProvider` risque de s'exécuter deux fois en développement, créant deux workers. L'utilisation d'une `ref` pour tracker l'initialisation serait plus robuste.
- **Headers HTTP Manquants** : `next.config.ts` est vide. Pour des performances optimales avec DuckDB-WASM (notamment sur de gros fichiers), il est recommandé d'ajouter les headers `Cross-Origin-Embedder-Policy` et `Cross-Origin-Opener-Policy`.

### 2. Qualité du Code (TypeScript)

**⚠️ Problèmes Identifiés**
- `src/lib/mappers.ts` contient un `// @ts-ignore`. Il faudrait typer correctement le parsing JSON (ex: utiliser `zod` ou une interface plus stricte) plutôt que d'ignorer l'erreur.
- `FuelDataLoader.tsx` crée une nouvelle connexion (`db.connect()`) alors que `DuckDBProvider` en expose déjà une via le contexte. Il serait plus efficace de réutiliser la connexion partagée si possible, ou de justifier pourquoi une nouvelle connexion est nécessaire (ex: concurrence).

### 3. Logique Métier

**✅ Bonnes Pratiques**
- Feedback utilisateur clair avec `sonner` (Toasts).
- Gestion d'état via `zustand` pour les stations.

**⚠️ Détails à Corriger**
- Le département est hardcodé à `85` dans `FuelDataLoader.tsx` alors que la User Story mentionnait `75` (Paris) en exemple. Idéalement, cela devrait être dynamique ou configuré via une variable/constante globale.
- La division des coordonnées par `100000` est correcte pour les données PDV, mais mérite un commentaire explicite ou une constante nommée.

---

## 🛠️ Actions Recommandées

1.  **Sécuriser l'initialisation** : Ajouter un `isInitialized` ref dans `DuckDBProvider` pour éviter le double chargement en dev.
2.  **Améliorer la config Next.js** : Ajouter les headers de sécurité dans `next.config.ts` pour supporter `SharedArrayBuffer` à l'avenir.
3.  **Nettoyer le typage** : Supprimer le `@ts-ignore` dans `mappers.ts` en typant le résultat du `JSON.parse`.
4.  **Dynamiser le département** : Préparer le code pour accepter un département en paramètre (actuellement hardcodé à 85).

Le code est fonctionnel et respecte les critères d'acceptation principaux. Ces ajustements sont mineurs mais amélioreront la robustesse et la maintenabilité.
