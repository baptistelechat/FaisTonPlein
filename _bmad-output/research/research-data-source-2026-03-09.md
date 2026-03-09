# Rapport de Recherche : Source de Données Open Data

**Date:** 2026-03-09
**Sujet:** Analyse du jeu de données "Prix des carburants en France - Flux instantané"
**Auteur:** Creative Intelligence (Trae)

## 1. Objectif

Valider la faisabilité technique du projet FaisTonPlein en analysant la source de données officielle (data.gouv.fr).
Identifier la structure, la fréquence de mise à jour, et le volume des données pour dimensionner l'architecture (Next.js + Parquet/HF vs Supabase).

## 2. Source de Données Identifiée

**Jeu de données :** [Prix des carburants en France - Flux instantané - v2](https://www.data.gouv.fr/fr/datasets/prix-des-carburants-en-france-flux-instantane-v2-amelioree/)
**Producteur :** Ministère de l'Économie, des Finances et de la Souveraineté industrielle et numérique
**ID Dataset :** `6407d088d4e23dc662022e2c`
**Licence :** Licence Ouverte v2.0 (Etalab)

### Ressources Disponibles

1.  **CSV (Recommandé pour l'ingestion) :**
    *   **URL :** `https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/exports/csv?use_labels=true`
    *   **ID Ressource :** `edd67f5b-46d0-4663-9de9-e5db1c880160`
    *   **Taille estimée :** ~19 Mo (non compressé)
    *   **Format :** UTF-8, séparateur `;` (probablement, à confirmer lors du fetch), structure aplatie.

2.  **JSON / GeoJSON :**
    *   Disponibles mais plus volumineux (~28-40 Mo).
    *   Utile si besoin de la structure hiérarchique native, mais le CSV aplati semble suffisant et plus performant à parser.

3.  **Source Primaire (prix-carburants.gouv.fr) :**
    *   **Page :** `https://www.prix-carburants.gouv.fr/rubrique/opendata/`
    *   **Format :** XML (Zippé).
    *   **Flux :** Instantané (`-10min`), Quotidien, Annuel.
    *   **Note :** C'est la source brute officielle. Le dataset data.gouv.fr ci-dessus est une version retraitée (aplatie) plus simple à consommer.
    *   **Utilisation :** Backup si l'API data.gouv.fr est indisponible, ou pour récupérer l'historique complet depuis 2007 (archives ZIP annuelles).

## 3. Analyse Structurelle (Échantillon)

L'API Tabulaire révèle une structure riche et dénormalisée contenant ~9,800 stations.

**Champs Clés :**
*   **Identification :** `id` (ex: 31860006), `Adresse`, `Ville`, `Code postal`.
*   **Géolocalisation :** `latitude`, `longitude`, `geom` (lat,lon string).
*   **Prix (Colonnes dynamiques ?) :**
    *   `Prix Gazole`, `Prix SP95`, `Prix E10`, `Prix SP98`, `Prix E85`, `Prix GPLc`.
    *   Timestamps associés : `Prix Gazole mis à jour le`, etc.
*   **Disponibilité :**
    *   `Carburants disponibles` (liste), `Carburants indisponibles`.
    *   `Rupture` (champs détaillés : `Début rupture...`, `Type rupture...` pour chaque carburant).
*   **Services :** `Services proposés` (ex: "Laverie, Relais colis, Wifi").
*   **Horaires :** `horaires détaillés`, `Automate 24-24 (oui/non)`.

**Fréquence de mise à jour :**
*   Le flux est mis à jour toutes les **10 minutes**.
*   C'est un "flux instantané", donc idéal pour du quasi temps réel.

## 4. Implications Architecturales

### Volume de Données
*   **Brut (CSV) :** ~19 Mo. Trop lourd pour un chargement client direct sur mobile.
*   **Compression (Parquet) :** Estimation à **2-4 Mo** avec compression Snappy/Zstd.
    *   *Action :* Le script d'ingestion doit convertir CSV -> Parquet.
*   **Partitionnement :**
    *   Possible par Département (`code_departement`).
    *   Ex: `fuel-prices-31.parquet` (~50-100 Ko).
    *   *Avantage :* Chargement ultra-rapide pour une recherche locale.
    *   *Inconvénient :* Plus complexe à gérer si l'utilisateur veut une vue nationale (rare).

### Stratégie de Requêtage (DuckDB-WASM vs Supabase)

**Option A : DuckDB-WASM (Client-side)**
*   **Pros :** Gratuit (hébergement fichier statique), pas de backend complexe, offline-first possible.
*   **Cons :** Initialisation du WASM (~10-20 Mo de téléchargement initial du moteur + données).
    *   *Risque :* UX lourde au premier chargement sur mobile 4G.
*   **Mitigation :** Ne charger DuckDB que pour le mode "Analyste". Pour le mode "Express" (carte locale), utiliser un fichier JSON/GeoJSON ultra-léger pré-généré par le pipeline (ex: `latest-prices-light.json` contenant juste ID, Lat, Lon, Prix).

**Option B : Supabase (Serverless SQL)**
*   **Pros :** API standard, filtrage serveur (payload client minime), temps réel via Realtime.
*   **Cons :** Quotas Free Tier (500MB, CPU limits). Ingestion toutes les 10 min = 144 writes/jour (négligeable) mais attention aux lectures si viral.
*   **Verdict :** Plus robuste pour le MVP mobile.

**Option C : Hybride (Recommandée)**
1.  **Ingestion :** GitHub Action (toutes les 30 min) -> Fetch CSV -> Clean -> Push JSON légers (par département) sur CDN (GitHub Pages / Vercel Blob).
2.  **Frontend :** Fetch `prices-{dept}.json` direct. Pas de DuckDB ni de Supabase pour la lecture simple.
3.  **Analytique (V2) :** DuckDB-WASM chargeant les Parquets complets pour les graphiques historiques.

## 5. Recommandations

1.  **Pipeline ETL :** Créer un script TypeScript/Node simple (`scripts/ingest-data.ts`) qui :
    *   Fetch le CSV Data.gouv.
    *   Convertit en JSON optimisé (dictionnaire par ID station ?).
    *   Découpe par département.
    *   Sauvegarde en local (pour commit git ou upload S3/Blob).
2.  **Format de Données Frontend :**
    *   Utiliser un format JSON minifié pour la carte.
    *   Exemple : `{ "31860006": { "l": [43.48, 1.38], "p": { "G": 1.999, "E10": 1.899 }, "u": 1709999999 } }`
3.  **Prochaine Étape :** Implémenter le script d'ingestion prototype ("Proof of Concept").
