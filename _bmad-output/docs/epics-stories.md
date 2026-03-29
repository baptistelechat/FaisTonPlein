# Epics & User Stories: FaisTonPlein

**Date :** 09/03/2026
**Auteur :** Baptiste (Product Manager)
**Statut :** Draft
**Version :** 1.0
**Source :** [PRD](../planning/prd-faistonplein.md)

***

## E00 - Fondations Techniques

**Objectif :** Mettre en place l'architecture de base et le pipeline de données.

### US-00-01 : Pipeline ETL (Data.gouv -> HuggingFace)

**En tant que** développeur,
**Je veux** automatiser la récupération, la transformation et la publication des données,
**Afin de** fournir des fichiers Parquet optimisés et à jour à l'application.

**Critères d'Acceptation :**

- [x] Script Node.js/TypeScript pour télécharger le CSV depuis data.gouv.fr.
- [x] Conversion des données en format Parquet (avec compression).
- [x] Partitionnement des fichiers par département.
- [x] Upload automatique vers un Dataset Hugging Face.
- [x] Exécution planifiée (GitHub Actions) ou manuelle.

### US-00-02 : Intégration Client DuckDB-WASM

**En tant que** développeur,
**Je veux** intégrer DuckDB-WASM dans l'application Next.js,
**Afin de** pouvoir requêter les fichiers Parquet directement dans le navigateur.

**Critères d'Acceptation :**

- [x] Initialisation de DuckDB-WASM dans un Web Worker.
- [x] Chargement d'un fichier Parquet (ex: département test) depuis Hugging Face.
- [x] Exécution d'une requête SQL simple (SELECT \* FROM prices LIMIT 10) avec affichage des résultats.

### US-00-03 : Consolidation des Données Historiques

**En tant que** data engineer,
**Je veux** consolider les fichiers de données historiques,
**Afin de** maintenir des performances de lecture optimales pour l'analyse sans perdre la granularité fine (jour/mois/année).

**Critères d'Acceptation :**

- [x] Création d'un script de consolidation journalier/mensuelle (Batch).
- [x] Le script fusionne les petits fichiers (par heure) en un fichier optimisé.
- [x] **Important** : Les fichiers sources (par heure) sont CONSERVÉS pour garder l'historique précis.
- [x] Structure cible : `consolidated/YYYY/MM/DD/code_departement=XX/data_0.parquet` / `consolidated/YYYY/MM/code_departement=XX/data_0.parquet` / `consolidated/YYYY/code_departement=XX/data_0.parquet` ou sinon directemnt dans la structure de `history`
- [x] Planification via CRON (ex: 1er du mois).

### US-00-04 : Récupération Historique (XML -> Parquet)

**En tant que** data engineer,
**Je veux** récupérer et intégrer les données historiques (annuelles et quotidiennes) depuis prix-carburants.gouv.fr,
**Afin de** constituer une base de données complète pour l'analyse des tendances sur le long terme. Ce sera un script a part que je lance une fois et que je ne relance plus jamais. Il faut trier les données dans la structure de dossier actuelle `history`

**Critères d'Acceptation :**

- [x] Script de téléchargement des archives annuelles (2007-2025) (XML dans ZIP).
- [x] Script de téléchargement des flux quotidiens (30 derniers jours) avec déduplication (ne pas écraser/dupliquer les jours déjà acquis).
- [x] Parsing des fichiers XML pour extraire les données (stations, prix, ruptures).
- [x] Conversion et intégration dans le pipeline existant (Parquet + HuggingFace).
- [x] Gestion des cas limites (fichiers corrompus, jours manquants).

***

## E01 - Exploration Géographique

**Objectif :** Permettre à l'utilisateur de visualiser et trouver les stations services autour de lui.

### US-01-01 : Carte Interactive

**En tant que** conducteur,
**Je veux** voir une carte centrée sur ma position avec les stations environnantes,
**Afin de** visualiser rapidement les options disponibles.

**Critères d'Acceptation :**

- [x] La carte s'affiche et se centre sur la géolocalisation de l'utilisateur (si autorisée).
- [x] Les stations sont représentées par des marqueurs.
- [x] Le zoom et le déplacement sur la carte sont fluides.
- [x] Au clic sur un marqueur, un résumé de la station s'affiche.

### US-01-02 : Liste des Stations

**En tant que** conducteur,
**Je veux** voir une liste des stations triée par distance ou prix,
**Afin de** comparer facilement les offres sans utiliser la carte.

**Critères d'Acceptation :**

- [x] Affichage d'une liste sous la carte (ou via un toggle).
- [x] Chaque élément affiche : Nom, Distance, Prix du carburant sélectionné.
- [x] Possibilité de trier par Distance ou Prix.

### US-01-03 : Détail d'une Station

**En tant que** conducteur,
**Je veux** accéder aux détails complets d'une station,
**Afin de** connaître son adresse, ses services et les prix de tous les carburants.

**Critères d'Acceptation :**

- [x] Page ou modale dédiée au détail.
- [x] Affichage de l'adresse complète avec lien vers GPS externe (Waze/Maps).
- [x] Liste des prix pour tous les carburants disponibles.
- [x] Liste des services (ex: Gonflage, Boutique).

### US-01-04 : Filtre Carburant

**En tant que** conducteur,
**Je veux** filtrer les stations par type de carburant (E10, SP98, Diesel...),
**Afin de** ne voir que celles qui proposent ce dont j'ai besoin.

**Critères d'Acceptation :**

- [x] Sélecteur de carburant accessible en haut de l'écran.
- [x] La carte et la liste se mettent à jour instantanément.
- [x] Le choix est sauvegardé pour les prochaines sessions.

***

## E02 - Comparaison Économique

**Objectif :** Fournir une analyse économique pertinente pour aider à la décision.

### US-02-01 : Prix à Jour et Fraîcheur

**En tant que** conducteur,
**Je veux** voir les prix avec une indication de leur fraîcheur,
**Afin de** ne pas me déplacer pour un prix obsolète.

**Critères d'Acceptation :**

- [x] Affichage de la date de dernière mise à jour des données.
- [x] Code couleur (Vert = < 24h, Orange = < 3j, Rouge = > 3j).

### US-02-02 : Calcul du Coût du Plein

**En tant que** conducteur économe,
**Je veux** saisir la capacité de mon réservoir,
**Afin de** voir le coût total estimé du plein plutôt que le prix au litre.

**Critères d'Acceptation :**

- [x] Input pour saisir la capacité (en Litres) dans les paramètres.
- [x] Affichage du coût total (ex: "85€") en évidence.
- [x] Le calcul se met à jour si le prix change.

### US-02-03 : Tri Intelligent (Prix + Distance)

**En tant que** conducteur pragmatique,
**Je veux** trier les stations par "coût réel" incluant le détour,
**Afin de** savoir si l'économie vaut le déplacement.

**Critères d'Acceptation :**

- [ ] Algorithme prenant en compte la consommation moyenne (paramétrable ou défaut).
- [ ] Affichage du surcoût lié au détour.

***

## E03 - Intelligence & Analyse

**Objectif :** Comprendre les tendances du marché.

### US-03-01 : Indicateur de Tendance

**En tant que** conducteur,
**Je veux** savoir si le prix est en hausse ou en baisse,
**Afin de** décider si je dois faire le plein maintenant ou attendre.

**Critères d'Acceptation :**

- [ ] Flèche (Hausse/Baisse/Stable) à côté du prix.
- [ ] Basé sur la moyenne locale des 7 derniers jours.

### US-03-02 : Mode Analyste

**En tant que** "Data Nerd",
**Je veux** activer un mode avancé,
**Afin de** visualiser des données supplémentaires sans surcharger l'interface par défaut.

**Critères d'Acceptation :**

- [ ] Toggle "Mode Analyste" dans les paramètres.
- [ ] L'activation affiche les graphiques et stats avancées.

### US-03-03 : Graphique Historique

**En tant que** analyste,
**Je veux** voir l'évolution du prix sur 30 jours,
**Afin de** comprendre la dynamique du marché.

**Critères d'Acceptation :**

- [ ] Graphique linéaire interactif (Recharts).
- [ ] Affichage des points de données au survol.

***

## E04 - Résilience (Offline)

**Objectif :** Garantir l'accès aux données en toutes circonstances.

### US-04-01 : Cache Départemental

**En tant que** système,
**Je veux** télécharger et mettre en cache les données du département de l'utilisateur,
**Afin de** permettre un fonctionnement fluide et offline.

**Critères d'Acceptation :**

- [ ] Téléchargement automatique (ou proposé) au premier lancement.
- [ ] Stockage local (IndexedDB via DuckDB).
- [ ] Indicateur de progression du téléchargement.

### US-04-02 : Consultation Offline

**En tant que** conducteur en zone blanche,
**Je veux** pouvoir consulter les stations et prix déjà chargés,
**Afin de** trouver de l'essence même sans réseau.

**Critères d'Acceptation :**

- [ ] L'application se lance sans réseau.
- [ ] Accès complet à la carte et liste (données en cache).
- [ ] Indicateur "Mode Hors Ligne".

