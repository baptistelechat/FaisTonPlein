# US-01-01 : Carte Interactive

**ID:** US-01-01
**Epic:** E01 - Exploration Géographique
**Priority:** Must Have
**Story Points:** 5
**Status:** Ready for Dev

## User Story

**En tant que** conducteur,
**Je veux** voir une carte centrée sur ma position avec les stations environnantes,
**Afin de** visualiser rapidement les options disponibles.

## Acceptance Criteria

- [ ] La carte s'affiche et se centre sur la géolocalisation de l'utilisateur (si autorisée).
- [ ] Les stations sont représentées par des marqueurs.
- [ ] Le zoom et le déplacement sur la carte sont fluides.
- [ ] Au clic sur un marqueur, un résumé de la station s'affiche.

## Technical Notes

- Utiliser une bibliothèque de carte (ex: Mapcn - <https://www.mapcn.dev/>).
- Intégrer la géolocalisation du navigateur - Gérer le blocage de la geolocation car absence HTTPS en mode dev.
- Récupérer les données des stations via l'API pour les derniere info + prévoir que des données seront téléchargé depuis <https://www.prix-carburants.gouv.fr/rubrique/opendata/> dans le futur ou une autre source de données CSV par exemle. 
- Gérer les cas où la géolocalisation est refusée (centrer sur une position par défaut, ex: Paris).

## Dependencies

- Aucune pour l'instant.

## Definition of Done

- [ ] Code complete
- [ ] Tests written and passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Deployed to dev environment

