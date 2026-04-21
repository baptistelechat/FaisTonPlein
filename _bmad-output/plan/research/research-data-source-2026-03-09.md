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
    - **URL :** `https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/exports/csv?use_labels=true`
    - **ID Ressource :** `edd67f5b-46d0-4663-9de9-e5db1c880160`
    - **Taille estimée :** ~19 Mo (non compressé)
    - **Format :** UTF-8, séparateur `;` (probablement, à confirmer lors du fetch), structure aplatie.

2.  **JSON / GeoJSON :**
    - Disponibles mais plus volumineux (~28-40 Mo).
    - Utile si besoin de la structure hiérarchique native, mais le CSV aplati semble suffisant et plus performant à parser.

3.  **Source Primaire (prix-carburants.gouv.fr) :**
    - **Page :** `https://www.prix-carburants.gouv.fr/rubrique/opendata/`
    - **Format :** XML (Zippé).
    - **Flux :** Instantané (`-10min`), Quotidien, Annuel.
    - **Note :** C'est la source brute officielle. Le dataset data.gouv.fr ci-dessus est une version retraitée (aplatie) plus simple à consommer.
    - **Utilisation :** Backup si l'API data.gouv.fr est indisponible, ou pour récupérer l'historique complet depuis 2007 (archives ZIP annuelles).

## 3. Analyse Structurelle (Échantillon)

L'API Tabulaire révèle une structure riche et dénormalisée contenant ~9,800 stations.

**Champs Clés :**

- **Identification :** `id` (ex: 31860006), `Adresse`, `Ville`, `Code postal`.
- **Géolocalisation :** `latitude`, `longitude`, `geom` (lat,lon string).
- **Prix (Colonnes dynamiques ?) :**
  - `Prix Gazole`, `Prix SP95`, `Prix E10`, `Prix SP98`, `Prix E85`, `Prix GPLc`.
  - Timestamps associés : `Prix Gazole mis à jour le`, etc.
- **Disponibilité :**
  - `Carburants disponibles` (liste), `Carburants indisponibles`.
  - `Rupture` (champs détaillés : `Début rupture...`, `Type rupture...` pour chaque carburant).
- **Services :** `Services proposés` (ex: "Laverie, Relais colis, Wifi").
- **Horaires :** `horaires détaillés`, `Automate 24-24 (oui/non)`.

**Fréquence de mise à jour :**

- Le flux est mis à jour toutes les **10 minutes**.
- C'est un "flux instantané", donc idéal pour du quasi temps réel.

## 4. Implications Architecturales

### Volume de Données

- **Brut (CSV) :** ~19 Mo. Trop lourd pour un chargement client direct sur mobile.
- **Compression (Parquet) :** Estimation à **2-4 Mo** avec compression Snappy/Zstd.
  - _Action :_ Le script d'ingestion doit convertir CSV -> Parquet.
- **Partitionnement :**
  - Possible par Département (`code_departement`).
  - Ex: `fuel-prices-31.parquet` (~50-100 Ko).
  - _Avantage :_ Chargement ultra-rapide pour une recherche locale.
  - _Inconvénient :_ Plus complexe à gérer si l'utilisateur veut une vue nationale (rare).

### Stratégie de Requêtage (DuckDB-WASM vs Supabase)

**Option A : DuckDB-WASM (Client-side)**

- **Pros :** Gratuit (hébergement fichier statique), pas de backend complexe, offline-first possible.
- **Cons :** Initialisation du WASM (~10-20 Mo de téléchargement initial du moteur + données).
  - _Risque :_ UX lourde au premier chargement sur mobile 4G.
- **Mitigation :** Ne charger DuckDB que pour le mode "Analyste". Pour le mode "Express" (carte locale), utiliser un fichier JSON/GeoJSON ultra-léger pré-généré par le pipeline (ex: `latest-prices-light.json` contenant juste ID, Lat, Lon, Prix).

**Option B : Supabase (Serverless SQL)**

- **Pros :** API standard, filtrage serveur (payload client minime), temps réel via Realtime.
- **Cons :** Quotas Free Tier (500MB, CPU limits). Ingestion toutes les 10 min = 144 writes/jour (négligeable) mais attention aux lectures si viral.
- **Verdict :** Plus robuste pour le MVP mobile.

**Option C : Architecture Décentralisée (Validée)**

- **Ingestion (Self-Hosted) :** Raspberry Pi 5 (8Go) exécutant un script Node.js/TypeScript.
  - _Process :_ Fetch CSV Data.gouv -> Nettoyage -> Partitionnement par Département -> Conversion Parquet (Snappy/Zstd).
  - _Publication :_ Push vers Hugging Face Datasets (Versioning sémantique v1, v1.1...).
- **Storage :** Hugging Face Datasets (Gratuit, Versionné, API-friendly).
- **Frontend (Next.js + DuckDB WASM) :**
  - Chargement des Parquets partitionnés (`prices-31.parquet`) via DuckDB WASM.
  - Requêtes SQL locales pour le filtrage et l'agrégation.
  - Avantage : Backend-less, Scalable (coût 0€), Performance analytique.

## 6. Analyse du Marché et Positionnement

### Paysage Concurrentiel

L'écosystème des prix du carburant en France est dominé par trois catégories d'acteurs :

1.  **Institutionnels :** `prix-carburants.gouv.fr` (Référence officielle, austère, peu ergonomique).
2.  **Communautaires/Open Source :** Projets GitHub (ETALAB, scripts Python/Home Assistant) souvent orientés "Geek/Domotique" ou visualisation simple sans historique profond.
3.  **Applications Commerciales (Leaders) :** "Essence / Gasoil Now", "Carburant moins cher", Waze. Modèle basé sur la pub ou la navigation GPS.

#### 6.1 Comparatif Détaillé

| Solution                  | Type             | Source Données            | Modèle Éco         | Points Forts                                         | Limites                                           |
| :------------------------ | :--------------- | :------------------------ | :----------------- | :--------------------------------------------------- | :------------------------------------------------ |
| **Carbu.com**             | Web & App (Intl) | Officiel + Communauté     | Pub + B2B (Mazout) | Couverture Euro, Itinéraires, Alertes                | Très commercial, Ads/Tracking, UX chargée         |
| **StationsCarburants.fr** | Web              | Officiel (J-1)            | Pub / Affiliation  | Infos Contrôle Tech, Simu. Trajet                    | Pas de "Temps Réel" strict, Visu simple           |
| **ViteMaPompe.fr**        | Web (Moderne)    | Officiel                  | Gratuit / Don ?    | UI propre (Nuxt), Localisation rapide                | Fonctionnalités limitées (Chercher/Trouver)       |
| **FaisTonPlein**          | **PWA / Static** | **Officiel (H-0.5) + HF** | **Open Source**    | **Analytique Client-Side (DuckDB), Privacy, No-Ads** | Charge init. (WASM), Pas de communauté (au début) |

### Positionnement de "FaisTonPlein"

Le projet se distingue par une approche **"Data Product" & "Privacy-First"** :

- **Transparence Totale :** Code Open Source et Dataset public versionné sur Hugging Face (rare).
- **Performance Analytique :** Utilisation de DuckDB WASM pour des requêtes complexes (stats, historique) directement dans le navigateur, là où les concurrents font de simples affichages de prix "instantanés".
- **Architecture "No-Cloud" :** Auto-hébergement de l'ingestion (RPi5) et indépendance vis-à-vis des VPS coûteux.
- **Cible :** Utilisateurs soucieux de la vie privée et "Data Enthusiasts" voulant explorer l'historique des prix.

**Verdict :** Le projet est viable car il occupe une niche technique (Analytique Client-Side) non couverte par les applications grand public (centrées sur la recherche GPS immédiate).

## 7. Stratégie de Différenciation (Vs ViteMaPompe)

ViteMaPompe est un excellent outil de "recherche instantanée", mais il reste une simple "vitrine" des données brutes. **FaisTonPlein** doit devenir un outil d'**Intelligence Économique Personnelle**.

### Axe 1 : L'Intelligence Contextuelle ("Le Waze du Prix")

Là où ViteMaPompe affiche juste un prix (ex: 1.85€), FaisTonPlein doit donner du **sens** grâce à DuckDB :

- **Indicateur de Tendance :** "Le prix monte dans votre zone (+2cts/L depuis hier) → Faites le plein maintenant !"
- **Score de Compétitivité :** "Cette station est 5% moins chère que la moyenne du département aujourd'hui."
- **Prédiction (Simple) :** Basée sur l'historique local (ex: "Le mardi est souvent le jour le moins cher ici").

### Axe 2 : Mode "Survie" (Offline-First)

En zone rurale ou blanche (là où on cherche souvent de l'essence), ViteMaPompe ne fonctionne pas sans réseau.

- **Différenciateur Massif :** Architecture **PWA + Local DB**.
- Une fois le département chargé (~100ko), l'app fonctionne **sans internet**. On peut consulter les derniers prix connus et la carte même au fond de la Creuse.

### Axe 3 : Gamification & Économies Réelles ("Le Yuka du Plein")

Ne pas parler en "Centimes/Litre" mais en "Euros/Plein".

- **Profil Véhicule :** L'utilisateur rentre la capacité de son réservoir (ex: 50L).
- **Comparatif Concret :** "Faire le plein ici vous coûte 85€ (vs 92€ à la station d'à côté). **Vous économisez 7€**."
- **Carnet de Bord (Local) :** Historique des pleins et cumul des économies réalisées sur l'année ("Bravo, vous avez économisé 120€ cette année grâce à l'app !").

### Axe 4 : Rapidité Radicale ("Shazam de la Pompe")

- **Zéro Clic :** L'app s'ouvre, géolocalise, et affiche DIRECTEMENT la meilleure station (algo multicritère : prix + distance). Pas de liste à scroller par défaut.
- **Widget Android :** Nativement supporté via le manifeste WebAPK (affichage des prix sur l'écran d'accueil).
- **Widget iOS :** Limitation technique actuelle des PWA sur iOS.
  - _Contournement :_ Utiliser les "Activités en Direct" (Live Activities) si emballé dans une app native (Capacitor), ou simplement une icône d'action rapide via Quick Actions (Force Touch).
  - _Alternative :_ Notifications push riches "Prix en baisse" (supportées depuis iOS 16.4).

## 8. Recommandations Mises à Jour

1.  **Pipeline ETL (RPi5) :** Créer un script TypeScript `scripts/ingest-hf.ts` :
    - Utiliser `@huggingface/hub` pour l'upload.
    - Utiliser `duckdb-async` ou `parquetjs` pour la conversion locale.
2.  **Frontend :**
    - Initialiser DuckDB-WASM avec un worker web.
    - Tester la latence de chargement d'un parquet départemental (~100Ko) depuis HF.
3.  **Prochaine Étape :** POC Ingestion RPi5 -> Hugging Face.
