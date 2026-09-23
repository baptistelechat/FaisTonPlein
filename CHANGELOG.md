# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this
project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Carte interactive centrée sur la géolocalisation, avec marqueurs et clustering des stations
- Liste des stations triable par prix ou par distance, avec vue détaillée (adresse, services, prix par carburant)
- Filtres par type de carburant, rayon de recherche et option autoroute
- Mise en avant visuelle de la station la moins chère et de la plus proche
- Navigation externe vers Google Maps ou Waze, badge station ouverte 24h/24, indicateur autoroute
- Logos de marque et noms réels des stations (récupérés depuis OpenStreetMap)
- Indicateur de fraîcheur des prix, avec avertissement si les données datent de plus de 2h
- Profil véhicule (préréglages, capacité du réservoir) et tri par coût réel du plein
- Mode distance routière avec temps de trajet et visualisation de l'itinéraire (OSRM / IGN)
- Indicateur de tendance des prix (moyenne 7 jours) et graphique d'historique sur 30 jours, avec visualisation des ruptures de stock
- Cache départemental hors-ligne transparent pour un accès rapide aux données déjà consultées
- Installation en tant qu'application (PWA) via Service Worker
- Personnalisation des habitudes de plein
- Page Politique de confidentialité, accessible depuis les Réglages
- Aperçu enrichi au partage du lien (réseaux sociaux, messageries) : prix moyens des 6 carburants et leur évolution sur 21 jours, actualisés automatiquement
- Totem des prix moyens nationaux sur la carte (version bureau) : les 6 carburants avec leur évolution sur 21 jours, pour se comparer à la moyenne française

### Changed

- Le calcul de la station "meilleur prix" / "plus proche" prend désormais en compte les filtres actifs et gère les égalités multiples
- Les filtres sont regroupés dans un dialogue de réglages, avec une mise en page mobile améliorée
- Le nom du carburant s'affiche dans une pastille colorée sur les cartes de prix du détail d'une station

### Fixed

- Correction de plusieurs bugs de statistiques par carburant (meilleur prix/distance selon les filtres actifs)
- Correction de bugs d'affichage mobile (position de défilement, tiroir, contrôles de carte)
- Correction du blocage d'état de chargement lié à la géolocalisation
