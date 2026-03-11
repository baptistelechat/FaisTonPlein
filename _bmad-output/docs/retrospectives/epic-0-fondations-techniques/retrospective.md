# Rétrospective : Epic 0 - Fondations Techniques

**Date :** 11/03/2026
**Facilitateur :** Baptiste (Scrum Master)
**Participants :** Baptiste (Product Manager / Developer)
**Statut :** Terminé

***

## 1. Contexte & Objectifs

**Objectif de l'Epic :** Mettre en place l'architecture de base et le pipeline de données pour l'application FaisTonPlein.
Il s'agissait de valider la faisabilité technique de l'approche "Serverless Data" (HuggingFace + DuckDB Client) et de préparer les données historiques.

### Tâches Réalisées
- [x] **US-00-01 : Pipeline ETL** (Node.js script -> Data.gouv -> HuggingFace Parquet)
- [x] **US-00-02 : Intégration DuckDB-WASM** (Client-side query engine)
- [x] **US-00-03 : Consolidation Historique** (Script de fusion des données journalières)
- [x] **US-00-04 : Récupération Historique** (XML -> Parquet)

***

## 2. Ce qui s'est bien passé (What went well)

### Architecture & Tech Stack
- **DuckDB & Parquet :** Le couple DuckDB (local & WASM) + Parquet s'est révélé extrêmement performant et adapté au besoin. La compression est excellente et les temps de lecture depuis HuggingFace sont très bons.
- **HuggingFace comme Backend Data :** L'utilisation de HF comme stockage gratuit et performant (via CDN) valide l'approche "zéro backend" pour la donnée statique.
- **Orchestration Node.js :** Les scripts ETL sont robustes, avec une bonne gestion des erreurs et des logs clairs. L'utilisation de `PM2` ou de simples `Cron` rend le déploiement sur RPi5 trivial.

### Méthodologie
- **Séparation des préoccupation :** L'architecture React avec `DuckDBProvider` et `DataLoader` permet de bien isoler la complexité technique de la logique métier.
- **Stratégie Hybride :** La décision de maintenir deux structures de données (`latest` pour l'app, `history` pour l'archive) offre le meilleur des deux mondes : performance pour l'utilisateur et complétude pour l'analyste.

## 3. Ce qui a été difficile (What didn't go well)

### Gestion des Données
- **Granularité Initiale :** Nous avons initialement visé une granularité trop fine (horaire/journalière) pour l'historique, ce qui a généré une explosion du nombre de fichiers et ralenti les traitements (US-00-04).
- **Complexité XML :** Le parsing des archives historiques (XML dans ZIP) a demandé plus d'efforts que prévu pour gérer les formats et les volumes de données (2007-2025).

### Intégration Frontend
- **WASM & Headers :** L'intégration de DuckDB-WASM nécessite des headers HTTP spécifiques (`Cross-Origin-Opener-Policy`, etc.) pour activer `SharedArrayBuffer` et obtenir les meilleures performances. Cela complique légèrement la configuration serveur (Vercel/Next.js).
- **React Strict Mode :** Le double appel des `useEffect` en mode développement a causé des soucis d'initialisation multiple du worker DuckDB.

## 4. Actions & Améliorations (Action Items)

### Pour l'Epic 1 (Exploration Géographique)
- [ ] **Frontend :** Configurer `next.config.ts` pour inclure les headers de sécurité nécessaires à DuckDB-WASM.
- [ ] **Frontend :** Sécuriser l'initialisation du provider DuckDB avec une `ref` pour éviter les doubles chargements en dev.
- [ ] **Data :** S'assurer que le script de récupération historique (US-00-04) est bien exécuté une fois pour toutes et que les données sont disponibles sur HF.

### Pour le Futur
- **Monitoring :** Mettre en place un système d'alerte simple si le pipeline ETL échoue (actuellement on compte sur les logs).
- **Optimisation :** Surveiller la taille des fichiers Parquet mensuels et envisager un partitionnement annuel si nécessaire (peu probable pour l'instant).

## 5. Conclusion
L'Epic 0 est un succès. Les fondations sont solides. L'architecture choisie est validée et permet de passer sereinement au développement des fonctionnalités utilisateur (Carte, Recherche) de l'Epic 1.
