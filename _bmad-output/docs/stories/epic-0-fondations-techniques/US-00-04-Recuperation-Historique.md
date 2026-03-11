# US-00-04 : Récupération Historique (XML -> Parquet)

**ID:** US-00-04
**Epic:** E00 - Fondations Techniques
**Priority:** Must Have
**Story Points:** 8
**Status:** Done

## User Story

**En tant que** data engineer,
**Je veux** récupérer et intégrer les données historiques (annuelles et quotidiennes) depuis prix-carburants.gouv.fr (https://www.prix-carburants.gouv.fr/rubrique/opendata/),
**Afin de** constituer une base de données complète pour l'analyse des tendances sur le long terme.

## Acceptance Criteria

- [x] Script de téléchargement des archives annuelles (2007-2025) (XML dans ZIP).
- [x] Script de téléchargement des flux quotidiens (30 derniers jours) avec déduplication (ne pas écraser/dupliquer les jours déjà acquis).
- [x] Parsing des fichiers XML pour extraire les données (stations, prix, ruptures).
- [x] Conversion et intégration dans le pipeline existant (Parquet + HuggingFace).
- [x] Gestion des cas limites (fichiers corrompus, jours manquants).
- [x] **Important** : Le script doit trier les données dans la structure de dossier actuelle `history`.

## Technical Notes

- **Script One-Shot** : Ce sera un script à part lancé une seule fois pour initialiser l'historique. Il ne sera pas relancé régulièrement.
- **Structure Cible** : Les données doivent être triées dans le dossier `history/`.
  - Vérifier la structure exacte attendue (partitionnement par date/département).
- **Parsing XML** : Utiliser une approche efficace pour les gros fichiers (streaming si nécessaire).
- **Format Parquet** : Assurer la compatibilité avec le schéma de données du pipeline quotidien.
- **Performance** : Le traitement de plusieurs années peut être long, prévoir des logs d'avancement.

## Dependencies

- Accès aux archives de prix-carburants.gouv.fr.
- Structure de dossier `history` existante.
- Bibliothèques de parsing XML et écriture Parquet.

## Definition of Done

- [x] Script d'import historique créé et fonctionnel.
- [x] Données historiques (2007-2025) correctement téléchargées, converties et classées dans `history/`.
- [x] Vérification de l'intégrité des données importées.
- [x] Code commité et documenté.
