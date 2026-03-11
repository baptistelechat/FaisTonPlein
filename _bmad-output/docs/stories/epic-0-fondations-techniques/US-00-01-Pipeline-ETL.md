# US-00-01 : Pipeline ETL sur RPi5

**ID:** US-00-01
**Epic:** E00 - Fondations Techniques
**Priority:** Must Have
**Story Points:** 5
**Status:** Ready for Dev

## User Story

**En tant que** développeur,
**Je veux** que le script ETL tourne en permanence sur mon RPi5,
**Afin de** maintenir les données à jour automatiquement sans intervention manuelle.

## Acceptance Criteria

- [ ] Le script Node.js/TypeScript télécharge et traite les données (Data.gouv -> Parquet -> HuggingFace).
- [ ] **Les données sont converties en Parquet et partitionnées par département (ou région) pour optimiser le chargement client.**
- [ ] Le script est configuré pour se lancer au démarrage du RPi5 (pm2 startup).
- [ ] Une tâche cron (node-cron ou crontab via pm2) lance l'exécution périodiquement.
- [ ] Gestion des logs et des erreurs via pm2.
- [ ] Documentation de la procédure d'installation sur le RPi5.

## Technical Notes

- Utiliser `pm2` pour la gestion du processus (démarrage, redémarrage, logs).
- Utiliser `node-cron` pour la planification interne au script, OU utiliser la fonctionnalité cron de pm2.
- S'assurer que les variables d'environnement (tokens HF, etc.) sont bien gérées sur le RPi.
- Le script doit être robuste aux coupures réseau.

## Dependencies

- Accès internet sur le RPi5.
- Compte Hugging Face configuré.
- Node.js et PM2 installés sur le RPi5.

## Definition of Done

- [ ] Script fonctionnel sur le RPi5.
- [ ] Données mises à jour sur Hugging Face automatiquement.
- [ ] Logs accessibles via `pm2 logs`.
- [ ] Redémarrage automatique au boot vérifié.
