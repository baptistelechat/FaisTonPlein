# Intégration Client DuckDB-WASM

**ID:** US-00-02
**Epic:** E00 - Fondations Techniques
**Priority:** Must Have
**Story Points:** 5

## User Story

**En tant que** développeur,
**Je veux** intégrer DuckDB-WASM dans l'application Next.js,
**Afin de** pouvoir requêter les fichiers Parquet directement dans le navigateur.

## Acceptance Criteria

- [ ] Initialisation de DuckDB-WASM dans un Web Worker.
- [ ] Chargement d'un seul fichier Parquet (ex: département 75 - Paris) depuis Hugging Face pour le moment.
- [ ] Exécution d'une requête SQL simple (`SELECT * FROM prices LIMIT 10`) avec affichage des résultats.

## Technical Notes

- Utiliser la librairie `@duckdb/duckdb-wasm`.
- Mettre en place un Context React ou un Hook global pour l'instance DB.
- Gérer le chargement asynchrone des bundles WASM.
- Attention à la configuration Next.js pour servir les fichiers WASM correctement (si nécessaire).
- Utiliser un fichier Parquet de test généré par l'ETL (US-00-01) ou disponible publiquement pour les tests.
- Prévoir la gestion des erreurs (chargement échoué, fichier non trouvé).

## Dependencies

- US-00-01 : Pipeline ETL (Done)

## Definition of Done

- [ ] Code complet et fonctionnel
- [ ] Tests écrits et passants (si applicable pour l'intégration WASM)
- [ ] Code review effectué
- [ ] Documentation mise à jour (README ou doc technique)
- [ ] Déployé en local/dev pour validation

