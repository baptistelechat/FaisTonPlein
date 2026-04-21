# Product Requirements Document (PRD) : FaisTonPlein

**Date :** 09/03/2026
**Auteur :** Baptiste (Product Manager)
**Statut :** Draft
**Version :** 1.0
**Source :** [Product Brief](../analysis/product-brief-faistonplein.md)

***

## 1. Introduction

### 1.1 Contexte

Le prix du carburant impacte directement le pouvoir d'achat. Les solutions actuelles manquent de transparence, sont intrusives (pubs/tracking) ou nécessitent une connexion constante. "FaisTonPlein" vise à redonner le pouvoir aux utilisateurs grâce à l'Open Data et une architecture locale performante.

### 1.2 Vision Produit

Devenir l'outil d'Intelligence Économique Personnelle de référence pour les automobilistes, alliant simplicité d'usage immédiat et profondeur d'analyse, le tout dans le respect absolu de la vie privée.

### 1.3 Portée (Scope)

Ce document couvre le MVP (Minimum Viable Product) et les fonctionnalités prévues pour la V1 (Analytique).

***

## 2. Objectifs & Succès

### 2.1 Objectifs Business

- Fournir une alternative citoyenne et performante aux applications commerciales.
- Démontrer la puissance des architectures "Local-First" (DuckDB-WASM).

### 2.2 Métriques de Succès (KPIs)

- **Performance :** Temps de chargement initial < 3s (First Contentful Paint).
- **Rétention :** Usage hebdomadaire par les utilisateurs actifs.
- **Fiabilité :** 99.9% de disponibilité des données (via pipeline GitHub/Hugging Face).
- **Impact Utilisateur :** Économie moyenne estimée de 5€ par plein.

***

## 3. Utilisateurs Cibles (Personas)

| Persona         | Rôle         | Besoin Principal                  | Fonctionnalité Clé                      |
| :-------------- | :----------- | :-------------------------------- | :-------------------------------------- |
| **Samia**       | L'Urgentiste | Trouver de l'essence _maintenant_ | Mode Express, Géolocalisation rapide    |
| **Jean-Pierre** | L'Économe    | Payer le moins cher possible      | Comparateur "Vrai Coût" (Plein complet) |
| **Alex**        | Le Data-Nerd | Analyser les tendances            | Graphiques historiques, Mode Analyste   |

***

## 4. Fonctionnalités (Requirements)

Priorisation basée sur la méthode MoSCoW (Must, Should, Could, Won't).

### 4.1 Épiques (Epics)

- **E01 - Exploration Géographique :** Visualiser et trouver les stations.
- **E02 - Comparaison Économique :** Analyser les prix et calculer les coûts.
- **E03 - Intelligence & Analyse :** Comprendre les tendances.
- **E04 - Résilience (Offline) :** Fonctionner sans réseau.

### 4.2 Exigences Fonctionnelles (FR)

#### E01 - Exploration Géographique

| ID        | Description                                              | Priorité | Critères d'Acceptation                                       |
| :-------- | :------------------------------------------------------- | :------- | :----------------------------------------------------------- |
| **FR-01** | Afficher une carte interactive centrée sur l'utilisateur | **MUST** | Utilisation de mapcn -<https://www.mapcn.dev/>. Zoom fluide. |
| **FR-02** | Lister les stations à proximité (rayon configurable)     | **MUST** | Liste triable par distance ou prix.                          |
| **FR-03** | Voir le détail d'une station                             | **MUST** | Affichage adresse, carburants dispos, horaires, services.    |
| **FR-04** | Filtrer par type de carburant                            | **MUST** | E10, SP98, Diesel, GPL, E85. Persistance du choix.           |

#### E02 - Comparaison Économique

| ID        | Description                             | Priorité   | Critères d'Acceptation                                                          |
| :-------- | :-------------------------------------- | :--------- | :------------------------------------------------------------------------------ |
| **FR-05** | Afficher les prix à jour (J-0 ou J-1)   | **MUST**   | Données issues du flux officiel. Code couleur (Vert/Orange/Rouge).              |
| **FR-06** | Calculer le coût du plein complet       | **SHOULD** | Input utilisateur "Capacité réservoir" (ex: 50L). Affichage "85€" vs "1.70€/L". |
| **FR-07** | Trier par "Prix du plein" vs "Distance" | **SHOULD** | Permettre d'arbitrer entre détour et économie.                                  |

#### E03 - Intelligence & Analyse

| ID        | Description                                  | Priorité   | Critères d'Acceptation                                 |
| :-------- | :------------------------------------------- | :--------- | :----------------------------------------------------- |
| **FR-08** | Indicateur de tendance (Hausse/Baisse)       | **SHOULD** | Flèche simple basée sur la moyenne locale J-7.         |
| **FR-09** | Mode Analyste (Toggle)                       | **SHOULD** | Active l'affichage des graphiques et données avancées. |
| **FR-10** | Graphique d'historique des prix (7/30 jours) | **COULD**  | Visualisation avec DuckDB sur les données historiques. |

#### E04 - Résilience (Offline)

| ID        | Description                               | Priorité | Critères d'Acceptation                                 |
| :-------- | :---------------------------------------- | :------- | :----------------------------------------------------- |
| **FR-11** | Mise en cache des données départementales | **MUST** | Téléchargement au premier lancement ou sur demande.    |
| **FR-12** | Consultation hors-ligne                   | **MUST** | L'app reste fonctionnelle (lecture seule) sans réseau. |

***

## 5. Exigences Non-Fonctionnelles (NFR)

### 5.1 Performance

- **NFR-01 :** Application PWA installable (Lighthouse PWA score > 90).
- **NFR-02 :** Taille du bundle initial < 200kb (Gzipped).
- **NFR-03 :** Requêtes DuckDB < 100ms pour les filtres standards.

### 5.2 Sécurité & Privacy

- **NFR-04 :** Zéro tracking utilisateur (pas de Google Analytics).
- **NFR-05 :** Aucune donnée personnelle envoyée au serveur (Local-First).
- **NFR-06 :** HTTPS obligatoire (Hébergement Vercel/Netlify).

### 5.3 Fiabilité & Data

- **NFR-07 :** Pipeline d'ingestion automatisé (GitHub Actions) quotidien.
- **NFR-08 :** Format de données optimisé (Parquet partitionné par département) pour minimiser la bande passante.

***

## 6. Architecture Technique (Aperçu)

- **Frontend :** Next.js 15 (React Server Components + Client Components pour la map).
- **UI Library :** Shadcn UI + Tailwind CSS 4.
- **Moteur Data Client :** DuckDB-WASM.
- **Data Source :** Open Data Gouv -> ETL Script (Python/Rust) -> Hugging Face Datasets (Parquet).
- **Hébergement :** Vercel (Frontend), Hugging Face (Data Lake).

## 7. Risques & Mitigations

| Risque                 | Impact                      | Mitigation                                                                 |
| :--------------------- | :-------------------------- | :------------------------------------------------------------------------- |
| **Volumétrie Données** | Performance client dégradée | Partitionnement strict par département. Chargement lazy de DuckDB.         |
| **API Open Data Down** | Données obsolètes           | Mise en cache CDN (Hugging Face) + Alerting sur le pipeline d'ingestion.   |
| **Complexité UX**      | Rejet utilisateur "lambda"  | "Progressive Disclosure" : Interface simple par défaut, mode expert caché. |

## 8. Roadmap & Phasing

1. **Phase 1 (MVP - Semaines 1-4) :**
   - Setup projet Next.js + mapcn.
   - Pipeline d'ingestion basique.
   - Affichage carte + liste (Online).
2. **Phase 2 (Offline & Data - Semaines 5-8) :**
   - Intégration DuckDB-WASM.
   - Mode Offline (Service Worker).
   - Calcul du "Vrai Coût".
3. **Phase 3 (Analytique & Polish - Semaines 9+) :**
   - Graphiques historiques.
   - Mode Analyste complet.
   - Optimisations PWA.

***

**Approbation :**

- [ ] Product Manager
- [ ] Lead Dev / Architecte

