# US-00-03 : Consolidation des Données Historiques

**ID:** US-00-03
**Epic:** E00 - Fondations Techniques
**Priority:** Must Have
**Story Points:** 5

## User Story

**En tant que** Data Engineer,
**Je veux** consolider les fichiers de données historiques (journalier/mensuel/annuel),
**Afin de** maintenir des performances de lecture optimales pour l'analyse sans perdre la granularité fine.

## Acceptance Criteria

- [ ] **Script de Consolidation** : Créer un script (Node.js/TypeScript) capable de fusionner des fichiers Parquet.
- [ ] **Stratégie de Fusion** :
  - Fusionner les fichiers horaires en fichiers journaliers.
  - Fusionner les fichiers journaliers en fichiers mensuels.
  - Fusionner les fichiers mensuels en fichiers annuels.
- [ ] **Préservation** : Les fichiers sources originaux (granularité fine) doivent être CONSERVÉS (dossier `history`), ne pas les supprimer après consolidation.
- [ ] **Structure Cible** : Les fichiers consolidés doivent suivre une structure logique, par exemple :
  - `consolidated/YYYY/MM/code_departement=XX/data.parquet` (Mensuel)
  - `consolidated/YYYY/MM/DD/code_departement=XX/data.parquet` (Journalier)
- [ ] **Automatisation & Orchestration** :
  - Le script doit être conçu pour s'exécuter en **séquence** après le téléchargement pour éviter les conflits (le téléchargement à 22h00 ne doit pas chevaucher la consolidation).
  - Recommandation : Créer un "Pipeline" qui chaîne les opérations.
  - **Planning CRON suggéré (via le script existant ou script unique lancé à 22h00)** :
    1. **22h00 - Étape 1 : Téléchargement** (Récupération des données fraîches) géré par le script dejà en place dans `/etl`.
    2. **Juste après (si succès) - Étape 2 : Consolidation Journalière** (Création du dossier `YYYY/MM/DD`).
    3. **Juste après (si dernier jour du mois) - Étape 3 : Consolidation Mensuelle** (Création du dossier `YYYY/MM`).
  - Cette approche par chaînage (`&&`) est plus robuste sur un RPi5 qu'une planification horaire stricte qui risquerait de lancer la consolidation alors que le téléchargement n'est pas fini.
- [ ] **Performance** : Utiliser un format optimisé (Parquet avec compression ZSTD/Snappy).

## Technical Notes

- Utiliser `duckdb` (Node.js binding) pour lire les fichiers existante et écrire les nouveaux fichiers Parquet efficacement.
- Le script doit être idempotent (relancer le script sur les mêmes données ne doit pas créer de doublons ou corrompre les fichiers).
- S'assurer que le schéma des données est cohérent lors de la fusion.
- Réutiliser les utilitaires existants dans `etl/` si possible.

## Dependencies

- US-00-01 : Pipeline ETL (Les données brutes doivent être disponibles).

## Definition of Done

- [ ] Le script de consolidation est implémenté et fonctionnel.
- [ ] Tests unitaires ou d'intégration validant la fusion correcte des données.
- [ ] Documentation technique mise à jour (README dans `etl/`).
- [ ] Code review validée.

