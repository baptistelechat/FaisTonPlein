# Document d'Architecture : FaisTonPlein

**Date :** 09/03/2026
**Auteur :** Baptiste (Architecte Système)
**Statut :** Brouillon
**Version :** 1.0
**Source :** [PRD](../planning/prd-faistonplein.md), [Design UX](../ux/ux-design-faistonplein.md)

***

## 1. Résumé Exécutif

FaisTonPlein est une Progressive Web App (PWA) "Local-First" conçue pour fournir des comparaisons de prix de carburant en temps réel, en mettant l'accent sur la confidentialité et la performance. Le système exploite l'Open Data, le traitement côté client via DuckDB-WASM, et un frontend statique hébergé sur Vercel. Cette architecture élimine le besoin d'une API backend traditionnelle pour les opérations de lecture, garantissant une haute disponibilité, une faible latence et aucun traçage des utilisateurs.

## 2. Modèles Architecturaux

### 2.1 Modèle Central : Local-First (Traitement des Données Côté Client)

Au lieu d'interroger une API distante pour chaque interaction utilisateur, l'application télécharge un jeu de données compact et optimisé (Parquet) sur le client. Toute la logique de filtrage, de tri et d'agrégation s'exécute localement dans le navigateur à l'aide de DuckDB-WASM.

**Justification :**

- **Confidentialité :** Aucune requête de recherche ou donnée de localisation ne quitte l'appareil (NFR-04, NFR-05).
- **Performance :** Retour instantané pour le filtrage et le tri une fois les données chargées (NFR-03).
- **Résilience :** Fonctionnalité complète en mode hors ligne après la récupération initiale des données (FR-12, NFR-01).

### 2.2 Modèle de Pipeline de Données : Génération Statique (ETL)

Les données sont ingérées depuis Open Data Gouv, traitées en fichiers Parquet optimisés, et publiées sur un hébergeur de fichiers statiques (Hugging Face Datasets) via des workflows automatisés.

**Justification :**

- **Fiabilité :** Découple la disponibilité des données du temps de disponibilité de l'API source (NFR-07).
- **Scalabilité :** Les fichiers statiques sont cachables en périphérie (CDN), supportant une forte concurrence (NFR-03).
- **Coût :** Élimine le besoin d'un serveur de base de données toujours actif.

***

## 3. Conception des Composants

### 3.1 Application Frontend (Next.js)

- **Framework :** Next.js 15 (App Router).
- **Hébergement :** Vercel.
- **Responsabilités :**
  - **Rendu UI :** React Server Components pour la structure (shell), Client Components pour la carte/liste interactive.
  - **Gestion d'État :** Zustand pour les préférences utilisateur (type de carburant, capacité du réservoir).
  - **Routage :** Routage standard par système de fichiers Next.js.
  - **Service Worker :** Mise en cache des assets et des données pour le support hors ligne (PWA).

### 3.2 Moteur de Données (DuckDB-WASM)

- **Runtime :** WebAssembly.
- **Responsabilités :**
  - **Exécution de Requêtes :** Requêtes SQL sur les fichiers Parquet locaux.
  - **Filtrage :** Par type de carburant, distance, prix.
  - **Calcul :** Calcul du "Vrai Coût" (Prix \* Volume + Coût Distance).
  - **Agrégation :** Génération des statistiques historiques pour le Mode Analyste.

### 3.3 Pipeline de Données (GitHub Actions)

- **Déclencheur :** Planifié (Quotidien/Horaire) ou Manuel.
- **Processus :**
  1. **Récupération (Fetch) :** Téléchargement XML/CSV depuis Open Data Gouv.
  2. **Transformation :** Nettoyage, normalisation et conversion en Parquet. Partitionnement par département.
  3. **Publication :** Upload vers le dépôt Hugging Face Datasets.
- **Sortie :** `prices-{dept}.parquet`, `stations-metadata.parquet`.

### 3.4 Fournisseur de Cartes

- **Service :** Leaflet (via `mapcn`).
- **Tuiles :** OpenStreetMap / IGN (Tuiles vectorielles préférées pour la performance).

***

## 4. Architecture des Données

### 4.1 Conception du Schéma

Optimisé pour la performance de lecture et la compression.

**Stations (Métadonnées)**

- `id` (String) : ID Unique.
- `lat` (Float) : Latitude.
- `lon` (Float) : Longitude.
- `services` (List<String>) : Services disponibles.
- `address` (String).

**Prix (Séries Temporelles)**

- `station_id` (FK).
- `fuel_type` (Enum) : E10, SP98, Diesel, etc.
- `price` (Float).
- `updated_at` (Timestamp).
- `department_code` (String) : Clé de partitionnement.

### 4.2 Flux de Données

1. **Ingestion :** Exécution d'un script NodeJS sur RPI 8Go -> Génère Parquet.
2. **Distribution :** Fichiers Parquet hébergés sur Hugging Face (CDN).
3. **Consommation :** L'App Client vérifie le cache local -> Télécharge le Parquet mis à jour pour le département de l'utilisateur -> Charge dans DuckDB.
4. **Requête :** L'utilisateur interagit -> Requête SQL -> Mise à jour UI.

***

## 5. Conception des Interfaces (API)

Puisqu'il n'y a pas d'API backend traditionnelle, l'"API" est le contrat entre le Frontend et l'instance DuckDB-WASM.

### 5.1 Couche d'Accès aux Données Interne (Hooks)

- `useFuelData(departmentCode)` : Gère le téléchargement Parquet et la connexion DuckDB.
- `useStations(filters)` : Retourne la liste filtrée des stations.
- `useStationDetails(stationId)` : Retourne les infos spécifiques de la station + historique.

### 5.2 Interfaces Externes

- **Open Data Gouv :** Source de vérité.
- **Hugging Face :** Livraison de fichiers statiques (HTTP GET `*.parquet`).

***

## 6. Couverture des Exigences

### 6.1 Exigences Fonctionnelles (FR)

| ID        | Exigence             | Solution                                                                                 |
| :-------- | :------------------- | :--------------------------------------------------------------------------------------- |
| **FR-01** | Carte Interactive    | Composant Leaflet mapcn intégrant les requêtes spatiales DuckDB.                         |
| **FR-02** | Liste des Stations   | Liste virtualisée (React-Window) propulsée par SQL `ORDER BY`.                           |
| **FR-03** | Détails Station      | Recherche par ID dans la table de métadonnées DuckDB.                                    |
| **FR-04** | Filtre Carburant     | SQL `WHERE fuel_type = ?`.                                                               |
| **FR-05** | Prix                 | Affichage du dernier prix depuis la table Prix.                                          |
| **FR-06** | Coût Plein Complet   | Colonne calculée : `price * user_tank_capacity`.                                         |
| **FR-07** | Tri                  | SQL `ORDER BY (price * capacity) + (distance * cost_per_km)`.                            |
| **FR-08** | Tendance             | Comparaison via fonction fenêtre `AVG(price) OVER (PARTITION BY station ORDER BY time)`. |
| **FR-09** | Mode Analyste        | Le toggle active des requêtes SQL avancées pour les données historiques.                 |
| **FR-10** | Graphique Historique | Recharts visualisant les données de séries temporelles de DuckDB.                        |
| **FR-11** | Cache Données        | Service Worker + Persistance IndexedDB (via DuckDB).                                     |
| **FR-12** | Hors Ligne           | Manifeste PWA + Stratégie Service Worker "Stale-While-Revalidate".                       |

### 6.2 Exigences Non-Fonctionnelles (NFR)

| ID         | Exigence           | Solution                                                                    |
| :--------- | :----------------- | :-------------------------------------------------------------------------- |
| **NFR-01** | Score PWA > 90     | Plugin PWA Next.js, assets optimisés, manifest.json.                        |
| **NFR-02** | Bundle < 200kb     | Code splitting, chargement différé (lazy) de DuckDB-WASM, lib carto légère. |
| **NFR-03** | Requêtes < 100ms   | Traitement colonnaire en mémoire (DuckDB), données partitionnées.           |
| **NFR-04** | Zéro Traçage       | Pas de scripts d'analytics, traitement local uniquement.                    |
| **NFR-05** | Local-First        | Toute la logique réside dans le bundle client.                              |
| **NFR-06** | HTTPS              | Application par défaut Vercel.                                              |
| **NFR-07** | Ingestion Auto     | Tâche planifiée GitHub Actions (cron).                                      |
| **NFR-08** | Données Optimisées | Format Apache Parquet (haute compression, colonnaire).                      |

***

## 7. Choix de la Stack Technique

| Composant                  | Technologie                      | Justification                                                              |
| :------------------------- | :------------------------------- | :------------------------------------------------------------------------- |
| **Framework Frontend**     | Next.js 15                       | React Server Components pour la performance du shell, support PWA robuste. |
| **Langage**                | TypeScript                       | Sécurité de type pour les structures de données complexes.                 |
| **Bibliothèque UI**        | Shadcn UI + Tailwind 4           | Styling moderne, accessible et léger.                                      |
| **Base de Données Locale** | DuckDB-WASM                      | Meilleure performance pour les requêtes analytiques dans le navigateur.    |
| **Bibliothèque Carto**     | Mapcn - <https://www.mapcn.dev/> | Support des tuiles vectorielles, rendu performant.                         |
| **Format de Données**      | Parquet                          | Compression efficace et performance de requête.                            |
| **CI/CD**                  | Script NodeJs sur RPI5 8Go       | Intégré,Gratuit                                                            |
| **Hébergement**            | Vercel (App) / HF (Data)         | Meilleure expérience développeur, CDN global fiable.                       |

***

## 8. Risques & Mitigations

| Risque                   | Impact                           | Mitigation                                                                                                   |
| :----------------------- | :------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| **Volume de Données**    | Téléchargement initial trop lent | Partitionnement par département (95+ fichiers). L'utilisateur ne télécharge que sa région active.            |
| **Compatibilité Navig.** | WASM non supporté                | Fallback vers un traitement JSON basique pour les vieux navigateurs (performance dégradée).                  |
| **Données Obsolètes**    | Prix non à jour                  | L'UI affiche explicitement le timestamp "Dernière màj". Rafraîchissement en arrière-plan via Service Worker. |
| **Usage Mémoire**        | Crash sur mobile bas de gamme    | Limiter les données historiques chargées en mémoire. Pagination pour les listes.                             |

***

**Approbation :**

- [ ] Product Manager
- [ ] Lead Developer

